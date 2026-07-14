import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useSettingsStore } from '@renderer/store/settingsStore'
import type { SalaryComponent, ComponentType, ComponentBasis } from '@renderer/core/types'
import { generateId } from '@renderer/lib/utils'

const TYPE_LABELS: Record<ComponentType, string> = {
  gross_allowance:      'Gross Allowance',
  employee_deduction:   'Employee Deduction',
  employer_contribution:'Employer Contribution'
}

const BASIS_LABELS: Record<ComponentBasis, string> = {
  fixed:         'Fixed (₹/month)',
  pct_of_basic:  '% of Basic',
  pct_of_gross:  '% of Gross',
  pct_of_ctc:    '% of Monthly CTC'
}

const TYPE_COLORS: Record<ComponentType, string> = {
  gross_allowance:       'bg-blue-50 text-blue-700',
  employee_deduction:    'bg-red-50 text-red-700',
  employer_contribution: 'bg-green-50 text-green-700'
}

export default function ComponentsPage() {
  const { salaryComponents, saveSalaryComponent, deleteSalaryComponent } = useSettingsStore()
  const [editing, setEditing] = useState<SalaryComponent | null>(null)

  const handleNew = () =>
    setEditing({
      id: generateId(),
      label: '',
      type: 'gross_allowance',
      basis: 'fixed',
      value: 0,
      applyMonthly: true,
      includeInPdf: true
    })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this component?')) return
    await deleteSalaryComponent(id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {salaryComponents.length} custom component{salaryComponents.length !== 1 ? 's' : ''}
        </p>
        <button onClick={handleNew} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> Add Component
        </button>
      </div>

      {salaryComponents.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center text-muted-foreground">
          <p className="text-sm">No custom components yet.</p>
          <p className="text-xs mt-1">Add components like Transport Allowance, Meal Allowance, etc.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Label</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">In PDF</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {salaryComponents.map(comp => (
                <tr key={comp.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{comp.label}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[comp.type]}`}>
                      {TYPE_LABELS[comp.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {comp.basis === 'fixed'
                      ? `₹${comp.value.toLocaleString('en-IN')}/month`
                      : `${(comp.value * 100).toFixed(2)}% — ${BASIS_LABELS[comp.basis]}`
                    }
                    {comp.condition && (
                      <span className="ml-2 text-amber-600">
                        if {comp.condition.field} {comp.condition.operator} {comp.condition.threshold}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {comp.includeInPdf ? '✓' : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing({ ...comp })} className="icon-btn" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(comp.id)} className="icon-btn hover:text-destructive" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ComponentModal
          comp={editing}
          onSave={async (c) => { await saveSalaryComponent(c); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Component edit modal ─────────────────────────────────────────────────────

function ComponentModal({ comp, onSave, onClose }: {
  comp: SalaryComponent
  onSave: (c: SalaryComponent) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<SalaryComponent>(comp)
  const [hasCondition, setHasCondition] = useState(!!comp.condition)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof SalaryComponent>(key: K, value: SalaryComponent[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) { alert('Label is required.'); return }
    const final: SalaryComponent = {
      ...form,
      condition: hasCondition ? form.condition : undefined
    }
    setSaving(true)
    await onSave(final)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{comp.label ? 'Edit' : 'Add'} Salary Component</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Label</label>
            <input
              className="input-base"
              value={form.label}
              onChange={e => set('label', e.target.value)}
              required
              placeholder="e.g. Transport Allowance"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select className="input-base" value={form.type} onChange={e => set('type', e.target.value as ComponentType)}>
                {(Object.keys(TYPE_LABELS) as ComponentType[]).map(k => (
                  <option key={k} value={k}>{TYPE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Basis</label>
              <select className="input-base" value={form.basis} onChange={e => set('basis', e.target.value as ComponentBasis)}>
                {(Object.keys(BASIS_LABELS) as ComponentBasis[]).map(k => (
                  <option key={k} value={k}>{BASIS_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Value {form.basis === 'fixed' ? '(₹/month)' : '(decimal, e.g. 0.05 = 5%)'}
            </label>
            <input
              className="input-base"
              type="number"
              step={form.basis === 'fixed' ? '1' : '0.0001'}
              min="0"
              value={form.value}
              onChange={e => set('value', +e.target.value)}
            />
          </div>

          {/* Conditional threshold */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={hasCondition}
                onChange={e => {
                  setHasCondition(e.target.checked)
                  if (e.target.checked && !form.condition) {
                    set('condition', { field: 'basic', operator: '>', threshold: 15000, belowValue: 0 })
                  }
                }}
              />
              Apply threshold condition
            </label>
            {hasCondition && form.condition && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Field</label>
                  <select
                    className="input-base text-xs"
                    value={form.condition.field}
                    onChange={e => set('condition', { ...form.condition!, field: e.target.value as 'basic' | 'gross' | 'ctc' })}
                  >
                    <option value="basic">Basic</option>
                    <option value="gross">Gross</option>
                    <option value="ctc">Monthly CTC</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Operator</label>
                  <select
                    className="input-base text-xs"
                    value={form.condition.operator}
                    onChange={e => set('condition', { ...form.condition!, operator: e.target.value as any })}
                  >
                    <option value=">=">&gt;=</option>
                    <option value=">">&gt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="<">&lt;</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Threshold (₹)</label>
                  <input
                    className="input-base text-xs"
                    type="number"
                    value={form.condition.threshold}
                    onChange={e => set('condition', { ...form.condition!, threshold: +e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Value when below threshold</label>
                  <input
                    className="input-base text-xs"
                    type="number"
                    step={form.basis === 'fixed' ? '1' : '0.0001'}
                    value={form.condition.belowValue}
                    onChange={e => set('condition', { ...form.condition!, belowValue: +e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.includeInPdf} onChange={e => set('includeInPdf', e.target.checked)} />
              Include in PDF annexure
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
