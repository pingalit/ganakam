import { describe, it, expect } from 'vitest'
import { calculate } from './engine'
import { DEFAULT_FY_RULES, DEFAULT_TIERS } from './defaults'
import type { CTCInput } from './types'

const fy = DEFAULT_FY_RULES[0]   // FY 2026-27
const tier1 = DEFAULT_TIERS[0]   // Tier 1
const tier2 = DEFAULT_TIERS[1]   // Tier 2
const tier3 = DEFAULT_TIERS[2]   // Tier 3

function input(annualCTC: number, tierId: string): CTCInput {
  return { name: 'Test', proposedCTC: annualCTC, tierId, fyId: fy.id }
}

// ─── Invariant: actualCTC ≈ proposedCTC / 12 (within ±5 due to rounding) ─────
describe('CTC invariant', () => {
  const cases = [
    { ctc: 120000, tier: tier3 },
    { ctc: 240000, tier: tier3 },
    { ctc: 360000, tier: tier2 },
    { ctc: 600000, tier: tier1 },
    { ctc: 1200000, tier: tier1 }
  ]

  cases.forEach(({ ctc, tier }) => {
    it(`Annual CTC ₹${ctc.toLocaleString()} ${tier.label}: actualCTC × 12 ≈ proposedCTC`, () => {
      const b = calculate(input(ctc, tier.id), fy, tier)
      expect(Math.abs(b.actualCTCAnnual - ctc)).toBeLessThanOrEqual(60)
    })
  })
})

// ─── PF capping at Basic > 15,000 ────────────────────────────────────────────
describe('PF cap logic', () => {
  it('Employee PF = 12% of basic when basic ≤ 15,000', () => {
    // Annual 240,000 → monthly 20,000 → basic 10,000 (Tier 3)
    const b = calculate(input(240000, 'tier3'), fy, tier3)
    expect(b.basic).toBe(10000)
    expect(b.employeePF).toBe(1200)    // 12 % × 10,000
    expect(b.employerPF).toBe(1300)    // 13 % × 10,000
  })

  it('Employee PF = capped at ₹1,800 when basic > 15,000', () => {
    // Annual 480,000 → monthly 40,000 → basic 20,000 (Tier 3)
    const b = calculate(input(480000, 'tier3'), fy, tier3)
    expect(b.basic).toBe(20000)
    expect(b.employeePF).toBe(1800)    // capped
    expect(b.employerPF).toBe(1950)    // capped
  })
})

// ─── ESI threshold at Gross > 21,000 ─────────────────────────────────────────
describe('ESI threshold logic', () => {
  it('ESI applies when gross ≤ 21,000', () => {
    // Annual 240,000 Tier 3 → gross ≈ 15,746
    const b = calculate(input(240000, 'tier3'), fy, tier3)
    expect(b.grossSalary).toBeLessThanOrEqual(21000)
    expect(b.employeeESI).toBeGreaterThan(0)
    expect(b.employerESI).toBeGreaterThan(0)
  })

  it('ESI is ₹0 when gross > 21,000', () => {
    // Annual 600,000 Tier 3 → gross will exceed 21,000
    const b = calculate(input(600000, 'tier3'), fy, tier3)
    expect(b.grossSalary).toBeGreaterThan(21000)
    expect(b.employeeESI).toBe(0)
    expect(b.employerESI).toBe(0)
  })
})

// ─── Professional Tax threshold at Gross ≥ 25,000 ────────────────────────────
describe('Professional Tax', () => {
  it('PT = 0 when gross < 25,000', () => {
    const b = calculate(input(240000, 'tier3'), fy, tier3)
    expect(b.grossSalary).toBeLessThan(25000)
    expect(b.professionalTax).toBe(0)
  })

  it('PT = ₹200 when gross ≥ 25,000', () => {
    // Annual 600,000 Tier 3 → gross ≈ 46,000+
    const b = calculate(input(600000, 'tier3'), fy, tier3)
    expect(b.grossSalary).toBeGreaterThanOrEqual(25000)
    expect(b.professionalTax).toBe(200)
  })
})

// ─── Net salary = Gross − Deductions ─────────────────────────────────────────
describe('Net salary calculation', () => {
  it('Net = Gross − total employee deductions', () => {
    const b = calculate(input(360000, 'tier2'), fy, tier2)
    expect(b.netSalary).toBe(
      b.grossSalary - b.totalEmployeeDeduction
    )
    expect(b.totalEmployeeDeduction).toBe(
      b.employeePF + b.employeeESI + b.employeeMedical + b.professionalTax
    )
  })
})

// ─── Gross component breakdown ────────────────────────────────────────────────
describe('Gross component breakdown', () => {
  it('Gross = Basic + HRA + CCA + Special Allowance', () => {
    const cases = [
      { ctc: 240000, tier: tier3 },
      { ctc: 500000, tier: tier2 },
      { ctc: 800000, tier: tier1 }
    ]
    cases.forEach(({ ctc, tier }) => {
      const b = calculate(input(ctc, tier.id), fy, tier)
      expect(b.grossSalary).toBe(b.basic + b.hra + b.cca + b.specialAllowance)
    })
  })

  it('Basic = 50% of monthly CTC', () => {
    const b = calculate(input(600000, 'tier3'), fy, tier3)
    expect(b.basic).toBe(Math.round((600000 / 12) * 0.5))
  })

  it('Tier 3 HRA = 35% of Basic', () => {
    const b = calculate(input(600000, 'tier3'), fy, tier3)
    expect(b.hra).toBe(Math.round(b.basic * 0.35))
  })

  it('Tier 3 CCA = 0', () => {
    const b = calculate(input(600000, 'tier3'), fy, tier3)
    expect(b.cca).toBe(0)
  })
})

// ─── Gratuity ─────────────────────────────────────────────────────────────────
describe('Gratuity', () => {
  it('Gratuity = 4.81% of Basic', () => {
    const b = calculate(input(240000, 'tier3'), fy, tier3)
    expect(b.gratuity).toBe(Math.round(b.basic * 0.0481))
  })
})
