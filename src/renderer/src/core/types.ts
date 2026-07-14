// ─── Calculator inputs ────────────────────────────────────────────────────────

export interface CTCInput {
  name: string
  proposedCTC: number   // Annual CTC in ₹
  tierId: string
  fyId: string
}

// ─── Calculator outputs ───────────────────────────────────────────────────────

export interface CTCBreakdown {
  input: CTCInput

  // Gross salary components (monthly)
  basic: number
  hra: number
  cca: number
  specialAllowance: number
  grossSalary: number

  // Employee deductions (monthly)
  employeePF: number
  employeeESI: number
  employeeMedical: number
  professionalTax: number
  totalEmployeeDeduction: number
  netSalary: number

  // Employer contributions (monthly)
  employerPF: number
  employerESI: number
  employerMedical: number
  byod: number
  gratuity: number
  totalEmployerContribution: number

  // Custom extra components from tier config
  extras: ExtraComponent[]

  // CTC totals
  actualCTC: number         // monthly
  actualCTCAnnual: number   // annual
}

export interface ExtraComponent {
  componentId: string
  label: string
  type: SalaryComponent['type']
  amount: number
}

// ─── Fiscal year rules ────────────────────────────────────────────────────────

export interface FYRuleSet {
  id: string              // e.g. "FY26-27"
  label: string           // e.g. "FY 2026–27"
  isActive: boolean

  // ESI (Employee State Insurance)
  esiGrossThreshold: number    // 21000 — ESI = 0 when gross exceeds this
  esiEmployeeRate: number      // 0.0075  (0.75 % of gross)
  esiEmployerRate: number      // 0.0325  (3.25 % of gross)

  // PF (Provident Fund)
  pfBasicThreshold: number     // 15000 — PF is capped when basic exceeds this
  pfEmployeeRate: number       // 0.12
  pfEmployeeCap: number        // 1800
  pfEmployerRate: number       // 0.13
  pfEmployerCap: number        // 1950

  // Professional Tax
  ptGrossThreshold: number     // 25000
  ptAmount: number             // 200

  // Fixed monthly contributions
  medicalFixed: number         // 462 — same for both employee & employer
  byodFixed: number            // 1500 — employer device allowance
  gratuityRate: number         // 0.0481 (4.81 % of basic)
}

// ─── Tier config ──────────────────────────────────────────────────────────────

export interface TierConfig {
  id: string
  label: string
  basicPercent: number     // % of monthly CTC  (e.g. 0.50)
  hraPercent: number       // % of basic         (e.g. 0.50 / 0.40 / 0.35)
  ccaPercent: number       // % of basic         (e.g. 0.20 / 0.10 / 0.00)
  sortOrder: number
  extraComponents: SalaryComponent[]
}

// ─── Custom salary components ─────────────────────────────────────────────────

export type ComponentType = 'gross_allowance' | 'employee_deduction' | 'employer_contribution'
export type ComponentBasis = 'fixed' | 'pct_of_basic' | 'pct_of_gross' | 'pct_of_ctc'

export interface SalaryComponent {
  id: string
  label: string
  type: ComponentType
  basis: ComponentBasis
  value: number
  // Optional threshold condition — mirrors PF/ESI capping logic
  condition?: {
    field: 'basic' | 'gross' | 'ctc'
    operator: '>=' | '>' | '<=' | '<'
    threshold: number
    belowValue: number    // value used when condition is NOT met
  }
  applyMonthly: boolean
  includeInPdf: boolean
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string
  createdAt: string        // ISO 8601
  breakdown: CTCBreakdown
}
