import type { FYRuleSet, TierConfig } from './types'

export const DEFAULT_FY_RULES: FYRuleSet[] = [
  {
    id: 'FY26-27',
    label: 'FY 2026–27',
    isActive: true,
    // ESI — waived when gross > ₹21,000/month
    esiGrossThreshold: 21000,
    esiEmployeeRate: 0.0075,
    esiEmployerRate: 0.0325,
    // PF — capped when basic > ₹15,000/month
    pfBasicThreshold: 15000,
    pfEmployeeRate: 0.12,
    pfEmployeeCap: 1800,
    pfEmployerRate: 0.13,
    pfEmployerCap: 1950,
    // Professional Tax — flat ₹200 when gross ≥ ₹25,000/month
    ptGrossThreshold: 25000,
    ptAmount: 200,
    // Fixed monthly contributions
    medicalFixed: 462,
    byodFixed: 1500,
    gratuityRate: 0.0481
  }
]

export const DEFAULT_TIERS: TierConfig[] = [
  {
    id: 'tier1',
    label: 'Tier 1',
    basicPercent: 0.5,
    hraPercent: 0.5,    // 50 % of Basic
    ccaPercent: 0.2,    // 20 % of Basic
    sortOrder: 0,
    extraComponents: []
  },
  {
    id: 'tier2',
    label: 'Tier 2',
    basicPercent: 0.5,
    hraPercent: 0.4,    // 40 % of Basic
    ccaPercent: 0.1,    // 10 % of Basic
    sortOrder: 1,
    extraComponents: []
  },
  {
    id: 'tier3',
    label: 'Tier 3',
    basicPercent: 0.5,
    hraPercent: 0.35,   // 35 % of Basic
    ccaPercent: 0.0,    // No CCA
    sortOrder: 2,
    extraComponents: []
  }
]
