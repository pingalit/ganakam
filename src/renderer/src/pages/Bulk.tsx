import { useRef } from 'react'
import { Users, Upload, Play, Download, Trash2, AlertCircle } from 'lucide-react'
import { useBulkStore } from '@renderer/store/bulkStore'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { parseCSV, generateCSVTemplate } from '@renderer/lib/csv'
import { formatINR } from '@renderer/lib/inr'

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

export default function BulkPage() {
  const { rows, results, processing, setRows, process, clear, exportCSV } = useBulkStore()
  const { tiers, activeFY } = useSettingsStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File | null) => {
    if (!file) return
    const text = await file.text()
    handleCSVContent(text)
  }

  const handleElectronOpen = async () => {
    const result = await (window as any).api.file.openCSV()
    if (result) handleCSVContent(result.content)
  }

  const handleCSVContent = (content: string) => {
    const { rows: parsed, errors } = parseCSV(content)
    if (errors.length > 0) alert('CSV parse errors:\n' + errors.join('\n'))
    setRows(parsed)
  }

  const downloadTemplate = () => {
    const content = generateCSVTemplate()
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk-upload-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const successCount = results.filter(r => r.breakdown).length
  const errorCount   = results.filter(r => r.error).length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Bulk Processing</h1>
          <p className="text-xs text-muted-foreground">
            {activeFY ? activeFY.label : 'No active FY'} · Upload CSV to process multiple employees
          </p>
        </div>
      </div>

      {/* Upload area */}
      <div className="bg-card border border-border rounded-lg p-5 mb-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={isElectron ? handleElectronOpen : () => fileRef.current?.click()}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={15} />
            Upload CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
          />
          <button onClick={downloadTemplate} className="btn-outline flex items-center gap-2 text-xs">
            <Download size={13} />
            Download Template
          </button>
        </div>

        {/* CSV format hint */}
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3 font-mono">
          <p className="font-semibold mb-1 font-sans">CSV format:</p>
          <p>Name,AnnualCTC,TierID</p>
          <p>Priya Sharma,600000,tier2</p>
          <p>Ravi Kumar,360000,tier3</p>
          <p className="mt-2 font-sans">Available tier IDs: {tiers.map(t => t.id).join(', ')}</p>
        </div>

        {/* Loaded rows summary */}
        {rows.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {rows.length} employee{rows.length !== 1 ? 's' : ''} loaded.
          </p>
        )}
      </div>

      {/* Actions */}
      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button
            onClick={process}
            disabled={processing}
            className="btn-primary flex items-center gap-2"
          >
            <Play size={15} />
            {processing ? 'Processing…' : `Process ${rows.length} Employees`}
          </button>
          {results.length > 0 && (
            <>
              <button onClick={exportCSV} className="btn-outline flex items-center gap-2">
                <Download size={15} />
                Export CSV
              </button>
              <button onClick={clear} className="btn-ghost flex items-center gap-2 text-destructive">
                <Trash2 size={15} />
                Clear
              </button>
            </>
          )}
          {results.length > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">
              {successCount} success{errorCount > 0 ? `, ${errorCount} error${errorCount > 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tier</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Annual CTC</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Gross/mo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Net/mo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actual CTC/mo</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <tr key={idx} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{r.row.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.row.tierId}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(r.row.annualCTC)}</td>
                    {r.breakdown ? (
                      <>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(r.breakdown.grossSalary)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">{formatINR(r.breakdown.netSalary)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(r.breakdown.actualCTC)}</td>
                        <td className="px-4 py-2.5 text-xs text-green-600">✓</td>
                      </>
                    ) : (
                      <>
                        <td colSpan={3} className="px-4 py-2.5 text-destructive text-xs flex items-center gap-1">
                          <AlertCircle size={12} /> {r.error}
                        </td>
                        <td></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
