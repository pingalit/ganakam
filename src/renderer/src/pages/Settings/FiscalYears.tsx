import { useState } from 'react'
import { Plus, Pencil, Trash2, CheckCircle, Copy } from 'lucide-react'
import { useSettingsStore } from '@renderer/store/settingsStore'
import type { FYRuleSet } from '@renderer/core/types'
import { generateId } from '@renderer/lib/utils'

export default function FiscalYearsPage() {
  const { fyRules, saveFYRule, deleteFYRule, setActiveFY } = useSettingsStore()
  const [editing, setEditing] = useState<FYRuleSet | null>(null)

  const handleEdit = (rule: FYRuleSet) => setEditing({ ...rule })

  const handleClone = (rule: FYRuleSet) => {
    setEditing({
      ...rule,
      id: '',
      label: rule.label + ' (copy)',
      isActive: false
    })
  }

  const handleNew = () => {
    const base = fyRules[fyRules.length - 1] ?? defaultFY()
    setEditing({ ...base, id: '', label: '', isActive: false })
  }

  const handleDelete = async (id: string) => {
    if (fyRules.length <= 1) { alert('Cannot delete the only fiscal year.'); return }
    if (!confirm('Delete this fiscal year?')) return
    await deleteFYRule(id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{fyRules.length} fiscal year{fyRules.length !== 1 ? 's' : ''}</p>
        <button onClick={handleNew} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> Add FY
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Label</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ESI Threshold</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">PF Threshold</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {fyRules.map(rule => (
              <tr key={rule.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 font-medium">{rule.label}</td>
                <td className="px-4 py-2.5 text-muted-foreground">₹{rule.esiGrossThreshold.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-muted-foreground">₹{rule.pfBasicThreshold.toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5">
                  {rule.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle size={10} /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => setActiveFY(rule.id)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Set active
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => handleEdit(rule)} className="icon-btn" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleClone(rule)} className="icon-btn" title="Clone">
                      <Copy size={13} />
                    </button>
                    {!rule.isActive && (
                      <button onClick={() => handleDelete(rule.id)} className="icon-btn hover:text-destructive" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <FYModal
          rule={editing}
          onSave={async (r) => { await saveFYRule(r); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── FY edit modal ─────────────────────────────────────────────────────────────

function FYModal({ rule, onSave, onClose }: {
  rule: FYRuleSet
  onSave: (r: FYRuleSet) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<FYRuleSet>({
    ...rule,
    id: rule.id || generateId()
  })
  const [saving, setSaving] = useState(false)

  const set = (key: keyof FYRuleSet, value: string | number | boolean) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.id.trim() || !form.label.trim()) { alert('ID and Label are required.'); return }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const pct = (v: number) => `${(v * 100).toFixed(2)} %`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{rule.id ? 'Edit' : 'Add'} Fiscal Year</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-6 grid grid-cols-2 gap-4">
            <FormField label="FY ID" hint="e.g. FY27-28">
              <input className="input-base" value={form.id} onChange={e => set('id', e.target.value)} required placeholder="FY27-28" />
            </FormField>
            <FormField label="Label">
              <input className="input-base" value={form.label} onChange={e => set('label', e.target.value)} required placeholder="FY 2027–28" />
            </FormField>

            <div className="col-span-2 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">ESI</p>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Gross Threshold (₹)" hint="ESI = 0 above this">
                  <input className="input-base" type="number" value={form.esiGrossThreshold} onChange={e => set('esiGrossThreshold', +e.target.value)} />
                </FormField>
                <FormField label={`Employee Rate (${pct(form.esiEmployeeRate)})`}>
                  <input className="input-base" type="number" step="0.0001" value={form.esiEmployeeRate} onChange={e => set('esiEmployeeRate', +e.target.value)} />
                </FormField>
                <FormField label={`Employer Rate (${pct(form.esiEmployerRate)})`}>
                  <input className="input-base" type="number" step="0.0001" value={form.esiEmployerRate} onChange={e => set('esiEmployerRate', +e.target.value)} />
                </FormField>
              </div>
            </div>

            <div className="col-span-2 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">PF (Provident Fund)</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Basic Threshold (₹)" hint="PF capped above this">
                  <input className="input-base" type="number" value={form.pfBasicThreshold} onChange={e => set('pfBasicThreshold', +e.target.value)} />
                </FormField>
                <FormField label={`Employee Rate (${pct(form.pfEmployeeRate)})`}>
                  <input className="input-base" type="number" step="0.001" value={form.pfEmployeeRate} onChange={e => set('pfEmployeeRate', +e.target.value)} />
                </FormField>
                <FormField label="Employee Cap (₹)">
                  <input className="input-base" type="number" value={form.pfEmployeeCap} onChange={e => set('pfEmployeeCap', +e.target.value)} />
                </FormField>
                <FormField label={`Employer Rate (${pct(form.pfEmployerRate)})`}>
                  <input className="input-base" type="number" step="0.001" value={form.pfEmployerRate} onChange={e => set('pfEmployerRate', +e.target.value)} />
                </FormField>
                <FormField label="Employer Cap (₹)">
                  <input className="input-base" type="number" value={form.pfEmployerCap} onChange={e => set('pfEmployerCap', +e.target.value)} />
                </FormField>
              </div>
            </div>

            <div className="col-span-2 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">Professional Tax</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Gross Threshold (₹)">
                  <input className="input-base" type="number" value={form.ptGrossThreshold} onChange={e => set('ptGrossThreshold', +e.target.value)} />
                </FormField>
                <FormField label="PT Amount (₹/month)">
                  <input className="input-base" type="number" value={form.ptAmount} onChange={e => set('ptAmount', +e.target.value)} />
                </FormField>
              </div>
            </div>

            <div className="col-span-2 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">Fixed Contributions</p>
              <div className="grid grid-cols-3 gap-4">
                <FormField label="Medical (₹/month)">
                  <input className="input-base" type="number" value={form.medicalFixed} onChange={e => set('medicalFixed', +e.target.value)} />
                </FormField>
                <FormField label="BYOD (₹/month)">
                  <input className="input-base" type="number" value={form.byodFixed} onChange={e => set('byodFixed', +e.target.value)} />
                </FormField>
                <FormField label={`Gratuity Rate (${pct(form.gratuityRate)})`}>
                  <input className="input-base" type="number" step="0.0001" value={form.gratuityRate} onChange={e => set('gratuityRate', +e.target.value)} />
                </FormField>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

function defaultFY(): FYRuleSet {
  return {
    id: '', label: '', isActive: false,
    esiGrossThreshold: 21000, esiEmployeeRate: 0.0075, esiEmployerRate: 0.0325,
    pfBasicThreshold: 15000, pfEmployeeRate: 0.12, pfEmployeeCap: 1800,
    pfEmployerRate: 0.13, pfEmployerCap: 1950,
    ptGrossThreshold: 25000, ptAmount: 200,
    medicalFixed: 462, byodFixed: 1500, gratuityRate: 0.0481
  }
}
