import { create } from 'zustand'
import type { FYRuleSet, TierConfig, SalaryComponent } from '@renderer/core/types'
import { DEFAULT_FY_RULES, DEFAULT_TIERS } from '@renderer/core/defaults'

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

interface SettingsState {
  fyRules: FYRuleSet[]
  tiers: TierConfig[]
  salaryComponents: SalaryComponent[]
  activeFY: FYRuleSet | null
  loading: boolean

  load: () => Promise<void>
  saveFYRule: (rule: FYRuleSet) => Promise<void>
  deleteFYRule: (id: string) => Promise<void>
  setActiveFY: (id: string) => Promise<void>
  saveTier: (tier: TierConfig) => Promise<void>
  deleteTier: (id: string) => Promise<void>
  reorderTiers: (ids: string[]) => Promise<void>
  saveSalaryComponent: (comp: SalaryComponent) => Promise<void>
  deleteSalaryComponent: (id: string) => Promise<void>
}

function activeFYFrom(rules: FYRuleSet[]): FYRuleSet | null {
  return rules.find(r => r.isActive) ?? rules[0] ?? null
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  fyRules: DEFAULT_FY_RULES,
  tiers: DEFAULT_TIERS,
  salaryComponents: [],
  activeFY: activeFYFrom(DEFAULT_FY_RULES),
  loading: false,

  load: async () => {
    if (!isElectron) return
    set({ loading: true })
    try {
      const api = (window as any).api
      const [fyRules, tiers, salaryComponents] = await Promise.all([
        api.db.getFYRules() as Promise<FYRuleSet[]>,
        api.db.getTiers()   as Promise<TierConfig[]>,
        api.db.getSalaryComponents() as Promise<SalaryComponent[]>
      ])
      set({
        fyRules,
        tiers: [...tiers].sort((a, b) => a.sortOrder - b.sortOrder),
        salaryComponents,
        activeFY: activeFYFrom(fyRules)
      })
    } finally {
      set({ loading: false })
    }
  },

  saveFYRule: async (rule) => {
    if (isElectron) await (window as any).api.db.saveFYRule(rule)
    const next = [...get().fyRules]
    const i = next.findIndex(r => r.id === rule.id)
    if (i >= 0) next[i] = rule; else next.push(rule)
    set({ fyRules: next, activeFY: activeFYFrom(next) })
  },

  deleteFYRule: async (id) => {
    if (isElectron) await (window as any).api.db.deleteFYRule(id)
    const next = get().fyRules.filter(r => r.id !== id)
    set({ fyRules: next, activeFY: activeFYFrom(next) })
  },

  setActiveFY: async (id) => {
    if (isElectron) await (window as any).api.db.setActiveFY(id)
    const next = get().fyRules.map(r => ({ ...r, isActive: r.id === id }))
    set({ fyRules: next, activeFY: activeFYFrom(next) })
  },

  saveTier: async (tier) => {
    if (isElectron) await (window as any).api.db.saveTier(tier)
    const next = [...get().tiers]
    const i = next.findIndex(t => t.id === tier.id)
    if (i >= 0) next[i] = tier; else next.push({ ...tier, sortOrder: next.length })
    set({ tiers: [...next].sort((a, b) => a.sortOrder - b.sortOrder) })
  },

  deleteTier: async (id) => {
    if (isElectron) await (window as any).api.db.deleteTier(id)
    set({ tiers: get().tiers.filter(t => t.id !== id) })
  },

  reorderTiers: async (ids) => {
    if (isElectron) await (window as any).api.db.reorderTiers(ids)
    const map = new Map(get().tiers.map(t => [t.id, t]))
    set({ tiers: ids.map((id, i) => ({ ...map.get(id)!, sortOrder: i })) })
  },

  saveSalaryComponent: async (comp) => {
    if (isElectron) await (window as any).api.db.saveSalaryComponent(comp)
    const next = [...get().salaryComponents]
    const i = next.findIndex(c => c.id === comp.id)
    if (i >= 0) next[i] = comp; else next.push(comp)
    set({ salaryComponents: next })
  },

  deleteSalaryComponent: async (id) => {
    if (isElectron) await (window as any).api.db.deleteSalaryComponent(id)
    set({ salaryComponents: get().salaryComponents.filter(c => c.id !== id) })
  }
}))
