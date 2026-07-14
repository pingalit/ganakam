import { useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { useSettingsStore } from '@renderer/store/settingsStore'
import type { TierConfig } from '@renderer/core/types'
import { generateId } from '@renderer/lib/utils'

export default function TiersPage() {
  const { tiers, saveTier, deleteTier, reorderTiers } = useSettingsStore()
  const [editing, setEditing] = useState<TierConfig | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  const handleNew = () =>
    setEditing({
      id: generateId(),
      label: '',
      basicPercent: 0.5,
      hraPercent: 0.4,
      ccaPercent: 0.1,
      sortOrder: tiers.length,
      extraComponents: []
    })

  const handleDelete = async (id: string) => {
    const DEFAULTS = ['tier1', 'tier2', 'tier3']
    if (DEFAULTS.includes(id)) { alert('Cannot delete default tiers.'); return }
    if (!confirm('Delete this tier?')) return
    await deleteTier(id)
  }

  // Simple drag-and-drop reorder
  const handleDragStart = (id: string) => setDragging(id)
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragging || dragging === targetId) return
    const ids = tiers.map(t => t.id)
    const from = ids.indexOf(dragging)
    const to   = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, dragging)
    reorderTiers(next)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tiers.length} tier{tiers.length !== 1 ? 's' : ''} · drag to reorder</p>
        <button onClick={handleNew} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={14} /> Add Tier
        </button>
      </div>

      <div className="space-y-2">
        {tiers.map(tier => (
          <div
            key={tier.id}
            draggable
            onDragStart={() => handleDragStart(tier.id)}
            onDragOver={(e) => handleDragOver(e, tier.id)}
            onDragEnd={() => setDragging(null)}
            className={`bg-card border border-border rounded-lg p-4 flex items-center gap-4 transition-opacity ${
              dragging === tier.id ? 'opacity-50' : ''
            }`}
          >
            <GripVertical size={16} className="text-muted-foreground cursor-grab flex-shrink-0" />

            <div className="flex-1">
              <p className="font-medium">{tier.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Basic {tier.basicPercent * 100}% of CTC · 
                HRA {tier.hraPercent * 100}% of Basic · 
                CCA {tier.ccaPercent * 100}% of Basic
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => setEditing({ ...tier })} className="icon-btn" title="Edit">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDelete(tier.id)} className="icon-btn hover:text-destructive" title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TierModal
          tier={editing}
          onSave={async (t) => { await saveTier(t); setEditing(null) }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// ─── Tier edit modal ──────────────────────────────────────────────────────────

function TierModal({ tier, onSave, onClose }: {
  tier: TierConfig
  onSave: (t: TierConfig) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<TierConfig>(tier)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof TierConfig, value: string | number) =>
    setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) { alert('Label is required.'); return }
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{tier.label ? 'Edit' : 'Add'} Tier</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tier Label</label>
            <input
              className="input-base"
              value={form.label}
              onChange={e => set('label', e.target.value)}
              required
              placeholder="e.g. Senior Band"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Basic %</label>
              <p className="text-xs text-muted-foreground">of monthly CTC</p>
              <input
                className="input-base"
                type="number" step="0.01" min="0" max="1"
                value={form.basicPercent}
                onChange={e => set('basicPercent', +e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">HRA %</label>
              <p className="text-xs text-muted-foreground">of Basic</p>
              <input
                className="input-base"
                type="number" step="0.01" min="0" max="1"
                value={form.hraPercent}
                onChange={e => set('hraPercent', +e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">CCA %</label>
              <p className="text-xs text-muted-foreground">of Basic</p>
              <input
                className="input-base"
                type="number" step="0.01" min="0" max="1"
                value={form.ccaPercent}
                onChange={e => set('ccaPercent', +e.target.value)}
              />
            </div>
          </div>

          <div className="bg-muted/30 rounded-md p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Preview (monthly CTC = ₹50,000)</p>
            <p>Basic: ₹{Math.round(50000 * form.basicPercent).toLocaleString('en-IN')}</p>
            <p>HRA:   ₹{Math.round(50000 * form.basicPercent * form.hraPercent).toLocaleString('en-IN')}</p>
            <p>CCA:   ₹{Math.round(50000 * form.basicPercent * form.ccaPercent).toLocaleString('en-IN')}</p>
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
