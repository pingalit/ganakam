import { useState } from 'react'
import { Clock, Trash2, RefreshCw, RotateCcw } from 'lucide-react'
import { useCalculatorStore } from '@renderer/store/calculatorStore'
import { useNavigate } from 'react-router-dom'
import { formatINR } from '@renderer/lib/inr'

export default function HistoryPage() {
  const { history, historyLoading, deleteHistory, clearHistory, loadFromHistory } = useCalculatorStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [clearing, setClearing] = useState(false)

  const filtered = history.filter(h =>
    h.breakdown.input.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleLoad = (id: string) => {
    const entry = history.find(h => h.id === id)
    if (!entry) return
    loadFromHistory(entry)
    navigate('/')
  }

  const handleClear = async () => {
    if (!confirm('Clear all history? This cannot be undone.')) return
    setClearing(true)
    await clearHistory()
    setClearing(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Clock size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Calculation History</h1>
          <p className="text-xs text-muted-foreground">{history.length} saved calculation{history.length !== 1 ? 's' : ''}</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="btn-ghost text-destructive flex items-center gap-1.5 text-sm"
          >
            <Trash2 size={14} />
            {clearing ? 'Clearing…' : 'Clear All'}
          </button>
        )}
      </div>

      {/* Search */}
      {history.length > 0 && (
        <input
          type="text"
          placeholder="Search by employee name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base mb-4 max-w-sm"
        />
      )}

      {/* Content */}
      {historyLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-40" />
          <p className="text-sm">Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
          <Clock size={40} className="mx-auto mb-3 opacity-15" />
          <p className="text-sm">
            {history.length === 0 ? 'No saved calculations yet' : 'No matches for your search'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tier · FY</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Annual CTC</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Net/month</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Saved</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => {
                  const b = entry.breakdown
                  return (
                    <tr key={entry.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{b.input.name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {b.input.tierId} · {b.input.fyId}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatINR(b.input.proposedCTC)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">
                        {formatINR(b.netSalary)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleLoad(entry.id)}
                            title="Re-open in calculator"
                            className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            onClick={() => deleteHistory(entry.id)}
                            title="Delete"
                            className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
