import { create } from 'zustand'
import type { CTCBreakdown, FYRuleSet, TierConfig } from '@renderer/core/types'
import { calculate } from '@renderer/core/engine'
import { useSettingsStore } from './settingsStore'
import { generateId } from '@renderer/lib/utils'
import { toCSV } from '@renderer/lib/csv'

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

export interface BulkRow {
  id: string
  name: string
  annualCTC: number | ''
  tierId: string
}

export interface BulkResult {
  row: BulkRow
  breakdown: CTCBreakdown | null
  error?: string
}

function emptyRow(tierId = 'tier1'): BulkRow {
  return { id: generateId(), name: '', annualCTC: '', tierId }
}

function computeResult(
  row: BulkRow,
  fy: FYRuleSet | null,
  tierMap: Map<string, TierConfig>
): BulkResult {
  if (!row.annualCTC || !fy) return { row, breakdown: null }
  const tier = tierMap.get(row.tierId)
  if (!tier) return { row, breakdown: null, error: `Unknown tier: ${row.tierId}` }
  try {
    return {
      row,
      breakdown: calculate(
        { name: row.name, proposedCTC: row.annualCTC as number, tierId: row.tierId, fyId: fy.id },
        fy,
        tier
      )
    }
  } catch (e) {
    return { row, breakdown: null, error: String(e) }
  }
}

function recompute(rows: BulkRow[]): BulkResult[] {
  const { fyRules, tiers } = useSettingsStore.getState()
  const fy = fyRules.find(f => f.isActive) ?? fyRules[0] ?? null
  const tierMap = new Map(tiers.map(t => [t.id, t]))
  return rows.map(row => computeResult(row, fy, tierMap))
}

async function downloadBuffer(
  buffer: Uint8Array,
  defaultPath: string,
  mimeType: string,
  filters?: { name: string; extensions: string[] }[]
) {
  if (isElectron) {
    await (window as any).api.file.saveBuffer({
      defaultPath,
      buffer: Array.from(buffer),
      filters
    })
  } else {
    const blob = new Blob([buffer], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultPath
    a.click()
    URL.revokeObjectURL(url)
  }
}

interface BulkState {
  rows: BulkRow[]
  results: BulkResult[]

  addRow: () => void
  updateRow: (id: string, patch: Partial<Omit<BulkRow, 'id'>>) => void
  deleteRow: (id: string) => void
  importRows: (rows: Omit<BulkRow, 'id'>[]) => void
  clear: () => void

  exportCSV: () => Promise<void>
  exportExcel: () => Promise<void>
  exportPDFs: () => Promise<void>
}

const DEFAULT_ROWS = [emptyRow(), emptyRow(), emptyRow()]

export const useBulkStore = create<BulkState>((set, get) => ({
  rows: DEFAULT_ROWS,
  results: DEFAULT_ROWS.map(r => ({ row: r, breakdown: null })),

  addRow: () => {
    const lastTier = get().rows.at(-1)?.tierId ?? 'tier1'
    const row = emptyRow(lastTier)
    const rows = [...get().rows, row]
    set({ rows, results: recompute(rows) })
  },

  updateRow: (id, patch) => {
    const rows = get().rows.map(r => r.id === id ? { ...r, ...patch } : r)
    set({ rows, results: recompute(rows) })
  },

  deleteRow: (id) => {
    const rows = get().rows.filter(r => r.id !== id)
    const next = rows.length === 0 ? [emptyRow()] : rows
    set({ rows: next, results: recompute(next) })
  },

  importRows: (incoming) => {
    const lastTier = get().rows.at(-1)?.tierId ?? 'tier1'
    const rows = incoming.map(r => ({ ...emptyRow(r.tierId || lastTier), ...r }))
    set({ rows, results: recompute(rows) })
  },

  clear: () => {
    const rows = DEFAULT_ROWS.map(() => emptyRow())
    set({ rows, results: rows.map(r => ({ row: r, breakdown: null })) })
  },

  exportCSV: async () => {
    const valid = get().results.filter(r => r.breakdown)
    if (valid.length === 0) return
    const headers = [
      'Name', 'Annual CTC', 'Tier',
      'Basic/mo', 'HRA/mo', 'CCA/mo', 'Gross/mo',
      'Emp PF/mo', 'Emp ESI/mo', 'Prof Tax/mo', 'Net Salary/mo',
      'Empr PF/mo', 'Empr ESI/mo', 'BYOD/mo', 'Gratuity/mo',
      'Actual CTC/mo', 'Actual CTC/yr'
    ]
    const rows = valid.map(r => {
      const b = r.breakdown!
      return [
        r.row.name, r.row.annualCTC, r.row.tierId,
        b.basic, b.hra, b.cca, b.grossSalary,
        b.employeePF, b.employeeESI, b.professionalTax, b.netSalary,
        b.employerPF, b.employerESI, b.byod, b.gratuity,
        b.actualCTC, b.actualCTCAnnual
      ]
    })
    const csv = toCSV(headers, rows)
    if (isElectron) {
      await (window as any).api.file.saveCSV({ defaultPath: 'bulk-ctc.csv', content: csv })
    } else {
      await downloadBuffer(new TextEncoder().encode(csv), 'bulk-ctc.csv', 'text/csv')
    }
  },

  exportExcel: async () => {
    const valid = get().results.filter(r => r.breakdown)
    if (valid.length === 0) return
    const { utils, write } = await import('xlsx')
    const headers = [
      'Name', 'Annual CTC', 'Tier',
      'Basic/mo', 'HRA/mo', 'CCA/mo', 'Gross/mo',
      'Emp PF/mo', 'Emp ESI/mo', 'Prof Tax/mo', 'Net Salary/mo',
      'Empr PF/mo', 'Empr ESI/mo', 'BYOD/mo', 'Gratuity/mo',
      'Actual CTC/mo', 'Actual CTC/yr'
    ]
    const dataRows = valid.map(r => {
      const b = r.breakdown!
      return [
        r.row.name, r.row.annualCTC, r.row.tierId,
        b.basic, b.hra, b.cca, b.grossSalary,
        b.employeePF, b.employeeESI, b.professionalTax, b.netSalary,
        b.employerPF, b.employerESI, b.byod, b.gratuity,
        b.actualCTC, b.actualCTCAnnual
      ]
    })
    const ws = utils.aoa_to_sheet([headers, ...dataRows])
    // Style header row bold
    const range = utils.decode_range(ws['!ref'] ?? 'A1')
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = utils.encode_cell({ r: 0, c })
      if (ws[cell]) ws[cell].s = { font: { bold: true } }
    }
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'CTC Breakdown')
    const buf = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    await downloadBuffer(
      new Uint8Array(buf),
      'bulk-ctc.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
    )
  },

  exportPDFs: async () => {
    const { fyRules } = useSettingsStore.getState()
    const fy = fyRules.find(f => f.isActive) ?? fyRules[0]
    if (!fy) return
    const valid = get().results.filter(r => r.breakdown)
    if (valid.length === 0) return

    const [{ pdf }, { AnnexureDocument }, JSZip] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@renderer/pdf/AnnexureTemplate'),
      import('jszip').then(m => m.default)
    ])
    const zip = new JSZip()
    for (const r of valid) {
      const blob = await pdf(
        AnnexureDocument({ breakdown: r.breakdown!, fy }) as any
      ).toBlob()
      const safeName = (r.row.name || 'employee').replace(/[^a-z0-9]/gi, '-')
      zip.file(`${safeName}-annexure.pdf`, blob)
    }
    const zipBuf = await zip.generateAsync({ type: 'uint8array' })
    await downloadBuffer(
      zipBuf,
      'bulk-annexures.zip',
      'application/zip',
      [{ name: 'ZIP Archive', extensions: ['zip'] }]
    )
  }
}))
