import { create } from 'zustand'
import type { CTCInput, CTCBreakdown, HistoryEntry } from '@renderer/core/types'
import { calculate } from '@renderer/core/engine'
import { useSettingsStore } from './settingsStore'
import { generateId } from '@renderer/lib/utils'

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

interface CalculatorState {
  input: CTCInput
  breakdown: CTCBreakdown | null
  history: HistoryEntry[]
  historyLoading: boolean

  setInput: (partial: Partial<CTCInput>) => void
  compute: () => void
  saveToHistory: () => Promise<void>
  loadHistory: () => Promise<void>
  deleteHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  loadFromHistory: (entry: HistoryEntry) => void
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  input: {
    name: '',
    proposedCTC: 0,
    tierId: 'tier1',
    fyId: 'FY26-27'
  },
  breakdown: null,
  history: [],
  historyLoading: false,

  setInput: (partial) =>
    set(s => ({ input: { ...s.input, ...partial } })),

  compute: () => {
    const { input } = get()
    const { fyRules, tiers } = useSettingsStore.getState()
    const fy   = fyRules.find(f => f.id === input.fyId) ?? fyRules.find(f => f.isActive)
    const tier = tiers.find(t => t.id === input.tierId)
    if (!fy || !tier || input.proposedCTC <= 0) { set({ breakdown: null }); return }
    set({ breakdown: calculate(input, fy, tier) })
  },

  saveToHistory: async () => {
    const { breakdown } = get()
    if (!breakdown) return
    const entry: HistoryEntry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      breakdown
    }
    if (isElectron) await (window as any).api.db.addHistory(entry)
    set(s => ({ history: [entry, ...s.history].slice(0, 1000) }))
  },

  loadHistory: async () => {
    if (!isElectron) return
    set({ historyLoading: true })
    try {
      const history = await (window as any).api.db.getHistory() as HistoryEntry[]
      set({ history })
    } finally {
      set({ historyLoading: false })
    }
  },

  deleteHistory: async (id) => {
    if (isElectron) await (window as any).api.db.deleteHistory(id)
    set(s => ({ history: s.history.filter(h => h.id !== id) }))
  },

  clearHistory: async () => {
    if (isElectron) await (window as any).api.db.clearHistory()
    set({ history: [] })
  },

  loadFromHistory: (entry) =>
    set({ input: entry.breakdown.input, breakdown: entry.breakdown })
}))
