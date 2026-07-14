import { create } from 'zustand'
import type { CTCBreakdown } from '@renderer/core/types'
import { calculate } from '@renderer/core/engine'
import { useSettingsStore } from './settingsStore'
import { toCSV } from '@renderer/lib/csv'

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

export interface BulkRow {
  name: string
  annualCTC: number
  tierId: string
}

export interface BulkResult {
  row: BulkRow
  breakdown: CTCBreakdown | null
  error?: string
}

interface BulkState {
  rows: BulkRow[]
  results: BulkResult[]
  processing: boolean

  setRows: (rows: BulkRow[]) => void
  process: () => void
  clear: () => void
  exportCSV: () => Promise<void>
}

export const useBulkStore = create<BulkState>((set, get) => ({
  rows: [],
  results: [],
  processing: false,

  setRows: (rows) => set({ rows, results: [] }),

  process: () => {
    const { rows } = get()
    const { fyRules, tiers } = useSettingsStore.getState()
    const activeFY = fyRules.find(f => f.isActive) ?? fyRules[0]

    set({ processing: true })
    const results: BulkResult[] = rows.map(row => {
      const tier = tiers.find(t => t.id === row.tierId)
      if (!tier || !activeFY) return { row, breakdown: null, error: 'Invalid tier or no active FY' }
      try {
        const breakdown = calculate(
          { name: row.name, proposedCTC: row.annualCTC, tierId: row.tierId, fyId: activeFY.id },
          activeFY,
          tier
        )
        return { row, breakdown }
      } catch (e) {
        return { row, breakdown: null, error: String(e) }
      }
    })
    set({ results, processing: false })
  },

  clear: () => set({ rows: [], results: [] }),

  exportCSV: async () => {
    const { results } = get()
    const valid = results.filter(r => r.breakdown)
    if (valid.length === 0) return

    const headers = [
      'Name', 'Annual CTC', 'Tier',
      'Basic (M)', 'HRA (M)', 'CCA (M)', 'Special Allowance (M)', 'Gross (M)',
      'Emp PF (M)', 'Emp ESI (M)', 'Emp Medical (M)', 'Prof Tax (M)', 'Net Salary (M)',
      'Empr PF (M)', 'Empr ESI (M)', 'Empr Medical (M)', 'BYOD (M)', 'Gratuity (M)',
      'Actual CTC (M)', 'Actual CTC (Annual)'
    ]

    const rows = valid.map(r => {
      const b = r.breakdown!
      return [
        r.row.name, r.row.annualCTC, r.row.tierId,
        b.basic, b.hra, b.cca, b.specialAllowance, b.grossSalary,
        b.employeePF, b.employeeESI, b.employeeMedical, b.professionalTax, b.netSalary,
        b.employerPF, b.employerESI, b.employerMedical, b.byod, b.gratuity,
        b.actualCTC, b.actualCTCAnnual
      ]
    })

    const csv = toCSV(headers, rows)

    if (isElectron) {
      await (window as any).api.file.saveCSV({ defaultPath: 'bulk-ctc-export.csv', content: csv })
    } else {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'bulk-ctc-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}))
