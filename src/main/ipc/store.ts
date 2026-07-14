import { ipcMain, app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// Inline types (cannot import from renderer — different compilation unit)
interface FYRuleSet {
  id: string
  label: string
  isActive: boolean
  esiGrossThreshold: number
  esiEmployeeRate: number
  esiEmployerRate: number
  pfBasicThreshold: number
  pfEmployeeRate: number
  pfEmployeeCap: number
  pfEmployerRate: number
  pfEmployerCap: number
  ptGrossThreshold: number
  ptAmount: number
  medicalFixed: number
  byodFixed: number
  gratuityRate: number
}

interface TierConfig {
  id: string
  label: string
  basicPercent: number
  hraPercent: number
  ccaPercent: number
  sortOrder: number
  extraComponents: unknown[]
}

interface AppData {
  fyRules: FYRuleSet[]
  tiers: TierConfig[]
  salaryComponents: unknown[]
  history: unknown[]
}

const SEED: AppData = {
  fyRules: [
    {
      id: 'FY26-27',
      label: 'FY 2026–27',
      isActive: true,
      esiGrossThreshold: 21000,
      esiEmployeeRate: 0.0075,
      esiEmployerRate: 0.0325,
      pfBasicThreshold: 15000,
      pfEmployeeRate: 0.12,
      pfEmployeeCap: 1800,
      pfEmployerRate: 0.13,
      pfEmployerCap: 1950,
      ptGrossThreshold: 25000,
      ptAmount: 200,
      medicalFixed: 462,
      byodFixed: 1500,
      gratuityRate: 0.0481
    }
  ],
  tiers: [
    { id: 'tier1', label: 'Tier 1', basicPercent: 0.5, hraPercent: 0.5,  ccaPercent: 0.2,  sortOrder: 0, extraComponents: [] },
    { id: 'tier2', label: 'Tier 2', basicPercent: 0.5, hraPercent: 0.4,  ccaPercent: 0.1,  sortOrder: 1, extraComponents: [] },
    { id: 'tier3', label: 'Tier 3', basicPercent: 0.5, hraPercent: 0.35, ccaPercent: 0.0,  sortOrder: 2, extraComponents: [] }
  ],
  salaryComponents: [],
  history: []
}

let _dataFilePath: string | null = null

function dataFilePath(): string {
  if (!_dataFilePath) {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    _dataFilePath = join(dir, 'ganakam-data.json')
  }
  return _dataFilePath
}

function read(): AppData {
  const p = dataFilePath()
  if (!existsSync(p)) return JSON.parse(JSON.stringify(SEED))
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8')) as Partial<AppData>
    return {
      fyRules:           raw.fyRules           ?? JSON.parse(JSON.stringify(SEED.fyRules)),
      tiers:             raw.tiers             ?? JSON.parse(JSON.stringify(SEED.tiers)),
      salaryComponents:  raw.salaryComponents  ?? [],
      history:           raw.history           ?? []
    }
  } catch {
    return JSON.parse(JSON.stringify(SEED))
  }
}

function write(data: AppData): void {
  writeFileSync(dataFilePath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function registerStoreHandlers(): void {
  // ── FY Rules ──────────────────────────────────────────────────────────────
  ipcMain.handle('store:getFYRules', () => read().fyRules)

  ipcMain.handle('store:saveFYRule', (_, rule: FYRuleSet) => {
    const d = read()
    const i = d.fyRules.findIndex(r => r.id === rule.id)
    if (i >= 0) d.fyRules[i] = rule; else d.fyRules.push(rule)
    write(d)
  })

  ipcMain.handle('store:deleteFYRule', (_, id: string) => {
    const d = read()
    d.fyRules = d.fyRules.filter(r => r.id !== id)
    write(d)
  })

  ipcMain.handle('store:setActiveFY', (_, id: string) => {
    const d = read()
    d.fyRules = d.fyRules.map(r => ({ ...r, isActive: r.id === id }))
    write(d)
  })

  // ── Tiers ─────────────────────────────────────────────────────────────────
  ipcMain.handle('store:getTiers', () => read().tiers)

  ipcMain.handle('store:saveTier', (_, tier: TierConfig) => {
    const d = read()
    const i = d.tiers.findIndex(t => t.id === tier.id)
    if (i >= 0) d.tiers[i] = tier; else d.tiers.push(tier)
    write(d)
  })

  ipcMain.handle('store:deleteTier', (_, id: string) => {
    const d = read()
    d.tiers = d.tiers.filter(t => t.id !== id)
    write(d)
  })

  ipcMain.handle('store:reorderTiers', (_, ids: string[]) => {
    const d = read()
    d.tiers = ids.map((id, i) => ({ ...d.tiers.find(t => t.id === id)!, sortOrder: i }))
    write(d)
  })

  // ── Salary Components ─────────────────────────────────────────────────────
  ipcMain.handle('store:getSalaryComponents', () => read().salaryComponents)

  ipcMain.handle('store:saveSalaryComponent', (_, comp: Record<string, unknown>) => {
    const d = read()
    const comps = d.salaryComponents as Record<string, unknown>[]
    const i = comps.findIndex(c => c['id'] === comp['id'])
    if (i >= 0) comps[i] = comp; else comps.push(comp)
    d.salaryComponents = comps
    write(d)
  })

  ipcMain.handle('store:deleteSalaryComponent', (_, id: string) => {
    const d = read()
    d.salaryComponents = (d.salaryComponents as Record<string, unknown>[]).filter(c => c['id'] !== id)
    write(d)
  })

  // ── History ───────────────────────────────────────────────────────────────
  ipcMain.handle('store:getHistory', () => read().history)

  ipcMain.handle('store:addHistory', (_, entry: unknown) => {
    const d = read()
    ;(d.history as unknown[]).unshift(entry)
    d.history = (d.history as unknown[]).slice(0, 1000)
    write(d)
  })

  ipcMain.handle('store:deleteHistory', (_, id: string) => {
    const d = read()
    d.history = (d.history as Record<string, unknown>[]).filter(h => h['id'] !== id)
    write(d)
  })

  ipcMain.handle('store:clearHistory', () => {
    const d = read()
    d.history = []
    write(d)
  })
}
