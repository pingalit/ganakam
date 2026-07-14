import { useState } from 'react'
import { Calculator, Download, Save } from 'lucide-react'
import { useCalculatorStore } from '@renderer/store/calculatorStore'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { BreakdownTable } from '@renderer/components/BreakdownTable'
import { formatINR } from '@renderer/lib/inr'
import { pdf } from '@react-pdf/renderer'
import { AnnexureDocument } from '@renderer/pdf/AnnexureTemplate'

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

export default function HomePage() {
  const { input, breakdown, setInput, compute, saveToHistory } = useCalculatorStore()
  const { fyRules, tiers, activeFY } = useSettingsStore()
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleCompute = () => {
    if (activeFY) setInput({ fyId: activeFY.id })
    compute()
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await saveToHistory()
    setSaving(false)
    setSaved(true)
  }

  const handleExportPDF = async () => {
    if (!breakdown || !activeFY) return
    setExporting(true)
    try {
      const blob = await pdf(<AnnexureDocument breakdown={breakdown} fy={activeFY} />).toBlob()
      const buffer = await blob.arrayBuffer()
      const fileName = `${(input.name || 'employee').replace(/\s+/g, '-')}-salary-annexure.pdf`
      if (isElectron) {
        await (window as any).api.file.savePDF({ defaultPath: fileName, buffer: Array.from(new Uint8Array(buffer)) })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calculator size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">CTC Calculator</h1>
          <p className="text-xs text-muted-foreground">
            {activeFY ? activeFY.label : 'No active FY'} · Annual CTC input
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Input panel ───────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Input</p>

            <Field label="Employee Name">
              <input
                type="text"
                value={input.name}
                onChange={e => setInput({ name: e.target.value })}
                placeholder="e.g. Priya Sharma"
                className="input-base"
              />
            </Field>

            <Field label="Annual CTC (₹)">
              <input
                type="number"
                value={input.proposedCTC || ''}
                onChange={e => setInput({ proposedCTC: Number(e.target.value) })}
                placeholder="e.g. 600000"
                min={0}
                className="input-base"
              />
              {input.proposedCTC > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  = {formatINR(input.proposedCTC / 12)}/month
                </p>
              )}
            </Field>

            <Field label="Tier">
              <select
                value={input.tierId}
                onChange={e => setInput({ tierId: e.target.value })}
                className="input-base"
              >
                {tiers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label} — Basic {t.basicPercent * 100}%, HRA {t.hraPercent * 100}%
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fiscal Year">
              <select
                value={input.fyId}
                onChange={e => setInput({ fyId: e.target.value })}
                className="input-base"
              >
                {fyRules.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.label}{f.isActive ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <button
              onClick={handleCompute}
              disabled={!input.proposedCTC}
              className="btn-primary w-full"
            >
              Calculate
            </button>
          </div>

          {/* Action buttons */}
          {breakdown && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="btn-outline flex-1 flex items-center justify-center gap-1.5"
              >
                <Save size={14} />
                {saved ? 'Saved' : saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="btn-outline flex-1 flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                {exporting ? 'Generating…' : 'Export PDF'}
              </button>
            </div>
          )}
        </div>

        {/* ── Breakdown ─────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {breakdown ? (
            <BreakdownTable breakdown={breakdown} />
          ) : (
            <div className="bg-card border border-border rounded-lg h-full min-h-72 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Calculator size={48} className="mx-auto mb-3 opacity-15" />
                <p className="text-sm">Enter CTC details and click Calculate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
