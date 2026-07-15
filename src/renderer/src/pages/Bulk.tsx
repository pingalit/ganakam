import { useRef, useState } from 'react'
import { Users, Plus, Trash2, Upload, Download, ChevronDown, FileText, FileSpreadsheet, FileArchive } from 'lucide-react'
import { useBulkStore } from '@renderer/store/bulkStore'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { parseCSV } from '@renderer/lib/csv'
import { formatINR } from '@renderer/lib/inr'

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

export default function BulkPage() {
  const { rows, results, addRow, updateRow, deleteRow, importRows, exportCSV, exportExcel, exportPDFs } = useBulkStore()
  const { tiers, activeFY } = useSettingsStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)

  const validCount      = results.filter(r => r.breakdown).length
  const totalNetMonthly = results.reduce((sum, r) => sum + (r.breakdown?.netSalary ?? 0), 0)
  const totalCTCAnnual  = results.reduce((sum, r) => sum + (r.breakdown?.actualCTCAnnual ?? 0), 0)

  const handleCSVContent = (content: string) => {
    const { rows: parsed, errors } = parseCSV(content)
    if (errors.length > 0) alert('CSV parse issues:\n' + errors.slice(0, 5).join('\n'))
    if (parsed.length > 0)
      importRows(parsed.map(r => ({ name: r.name, annualCTC: r.annualCTC, tierId: r.tierId })))
  }

  const handleFileSelect = async (file: File | null) => {
    if (!file) return
    handleCSVContent(await file.text())
  }

  const handleElectronOpen = async () => {
    const result = await (window as any).api.file.openCSV()
    if (result) handleCSVContent(result.content)
  }

  const doExport = async (fn: () => Promise<void>, label: string) => {
    setExportOpen(false)
    setExporting(label)
    try { await fn() } finally { setExporting(null) }
  }

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, field: string) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return
    e.preventDefault()
    const fields = ['name', 'annualCTC', 'tierId']
    const fi = fields.indexOf(field)
    if (fi < fields.length - 1) {
      document.querySelector<HTMLElement>(`[data-row="${rowIdx}"][data-field="${fields[fi + 1]}"]`)?.focus()
    } else {
      if (rowIdx === rows.length - 1) addRow()
      setTimeout(() => {
        document.querySelector<HTMLElement>(`[data-row="${rowIdx + 1}"][data-field="name"]`)?.focus()
      }, 0)
    }
  }

  return (
    <div className="p-6 flex flex-col gap-5 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
          <Users size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold">Bulk Calculator</h1>
          <p className="text-xs text-muted-foreground">
            {activeFY?.label ?? 'No active FY'} · Enter data directly or import CSV
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={isElectron ? handleElectronOpen : () => fileRef.current?.click()}
            className="btn-outline flex items-center gap-1.5 text-sm"
          >
            <Upload size={14} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} />
          <div className="relative">
            <button
              onClick={() => setExportOpen(o => !o)}
              disabled={validCount === 0}
              className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <Download size={14} />
              {exporting ? `${exporting}…` : 'Export'}
              <ChevronDown size={12} />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[170px]">
                  <button onClick={() => doExport(exportCSV, 'CSV')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left">
                    <FileText size={14} className="text-muted-foreground" /> Export CSV
                  </button>
                  <button onClick={() => doExport(exportExcel, 'Excel')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left">
                    <FileSpreadsheet size={14} className="text-muted-foreground" /> Export Excel (.xlsx)
                  </button>
                  <button onClick={() => doExport(exportPDFs, 'PDFs')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-left">
                    <FileArchive size={14} className="text-muted-foreground" /> Export PDFs (.zip)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-center px-2 py-2.5 font-medium text-muted-foreground bg-muted/30 w-8">#</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground bg-muted/30 min-w-[160px]">Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground bg-muted/30 min-w-[140px]">Annual CTC (₹)</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground bg-muted/30 min-w-[110px]">Tier</th>
                <th className="w-px bg-border p-0" />
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground bg-muted/10 min-w-[95px]">Basic/mo</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground bg-muted/10 min-w-[85px]">HRA/mo</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground bg-muted/10 min-w-[95px]">Gross/mo</th>
                <th className="text-right px-3 py-2.5 font-medium text-primary/80 bg-primary/5 min-w-[105px]">Net/mo</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground bg-muted/10 min-w-[95px]">CTC/mo</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground bg-muted/10 min-w-[110px]">CTC/yr</th>
                <th className="w-8 bg-muted/30" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const b = results[idx]?.breakdown
                return (
                  <tr key={row.id} className="border-t border-border/50 group hover:bg-muted/5 transition-colors">
                    <td className="px-2 py-1 text-muted-foreground text-xs text-center select-none">{idx + 1}</td>

                    <td className="px-1 py-1">
                      <input type="text" value={row.name} placeholder="Employee name"
                        data-row={idx} data-field="name"
                        onChange={e => updateRow(row.id, { name: e.target.value })}
                        onKeyDown={e => handleKeyDown(e, idx, 'name')}
                        className="w-full px-2 py-1.5 rounded border border-transparent bg-transparent
                          hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/50
                          text-sm placeholder:text-muted-foreground/40 transition-colors" />
                    </td>

                    <td className="px-1 py-1">
                      <input type="number" value={row.annualCTC} placeholder="e.g. 600000" min={0}
                        data-row={idx} data-field="annualCTC"
                        onChange={e => updateRow(row.id, { annualCTC: e.target.value === '' ? '' : Number(e.target.value) })}
                        onKeyDown={e => handleKeyDown(e, idx, 'annualCTC')}
                        className="w-full px-2 py-1.5 rounded border border-transparent bg-transparent
                          hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/50
                          text-sm placeholder:text-muted-foreground/40 transition-colors" />
                    </td>

                    <td className="px-1 py-1">
                      <select value={row.tierId} data-row={idx} data-field="tierId"
                        onChange={e => updateRow(row.id, { tierId: e.target.value })}
                        onKeyDown={e => handleKeyDown(e, idx, 'tierId')}
                        className="w-full px-2 py-1.5 rounded border border-transparent bg-transparent
                          hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/50
                          text-sm transition-colors">
                        {tiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </td>

                    <td className="w-px bg-border p-0" />
                    <CalcCell value={b ? formatINR(b.basic)           : ''} />
                    <CalcCell value={b ? formatINR(b.hra)             : ''} />
                    <CalcCell value={b ? formatINR(b.grossSalary)     : ''} />
                    <CalcCell value={b ? formatINR(b.netSalary)       : ''} highlight />
                    <CalcCell value={b ? formatINR(b.actualCTC)       : ''} />
                    <CalcCell value={b ? formatINR(b.actualCTCAnnual) : ''} />

                    <td className="px-1 py-1 text-center">
                      <button onClick={() => deleteRow(row.id)} title="Delete row"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground
                          hover:text-destructive hover:bg-destructive/10 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td colSpan={13}>
                  <button onClick={addRow}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                    <Plus size={14} /> Add row
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary */}
      {validCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{validCount}</span> employee{validCount !== 1 ? 's' : ''}</span>
          <span>Total net payroll: <span className="font-semibold text-foreground">{formatINR(totalNetMonthly)}/mo</span></span>
          <span>Total annual CTC: <span className="font-semibold text-foreground">{formatINR(totalCTCAnnual)}/yr</span></span>
        </div>
      )}

      {/* CSV format hint */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground select-none">CSV import format</summary>
        <div className="mt-2 bg-muted/40 rounded-md p-3 font-mono space-y-0.5">
          <p>Name,AnnualCTC,TierID</p>
          <p>Priya Sharma,600000,tier2</p>
          <p>Ravi Kumar,360000,tier3</p>
          <p className="font-sans mt-2">Available tier IDs: {tiers.map(t => t.id).join(', ')}</p>
        </div>
      </details>
    </div>
  )
}

function CalcCell({ value, highlight }: { value: string; highlight?: boolean }) {
  return (
    <td className={`px-3 py-1.5 text-right tabular-nums select-none text-sm
      ${highlight ? 'bg-primary/5 font-semibold text-primary' : 'bg-muted/10 text-muted-foreground'}`}>
      {value}
    </td>
  )
}