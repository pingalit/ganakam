import type {
  CTCInput,
  CTCBreakdown,
  FYRuleSet,
  TierConfig,
  SalaryComponent,
  ExtraComponent
} from './types'

// ─── Extra component evaluation ───────────────────────────────────────────────

function evalComponent(
  comp: SalaryComponent,
  basic: number,
  gross: number,
  monthlyCTC: number
): number {
  // Resolve the active value (with optional threshold condition)
  let activeValue = comp.value
  if (comp.condition) {
    const fieldVal =
      comp.condition.field === 'basic' ? basic :
      comp.condition.field === 'gross' ? gross :
      monthlyCTC

    const conditionMet =
      comp.condition.operator === '>=' ? fieldVal >= comp.condition.threshold :
      comp.condition.operator === '>'  ? fieldVal >  comp.condition.threshold :
      comp.condition.operator === '<=' ? fieldVal <= comp.condition.threshold :
                                         fieldVal <  comp.condition.threshold

    activeValue = conditionMet ? comp.value : comp.condition.belowValue
  }

  switch (comp.basis) {
    case 'fixed':        return activeValue
    case 'pct_of_basic': return basic      * activeValue
    case 'pct_of_gross': return gross      * activeValue
    case 'pct_of_ctc':   return monthlyCTC * activeValue
    default:             return activeValue
  }
}

// ─── Main calculation ─────────────────────────────────────────────────────────

/**
 * Calculate a full CTC breakdown.
 *
 * Algorithm overview:
 *   1. Derive Basic, HRA, CCA from percentage rules.
 *   2. Compute fixed employer contributions (EPF, Medical, BYOD, Gratuity).
 *   3. Solve for Gross (Employer ESI depends on Gross — circular — so we solve analytically).
 *   4. Derive Special Allowance as the residual after basic + HRA + CCA.
 *   5. Compute employee deductions using the now-known Gross.
 *   6. Evaluate any extra SalaryComponents attached to the tier.
 *
 * All returned figures are MONTHLY unless a field ends in "Annual".
 * proposedCTC is accepted as ANNUAL and divided by 12 internally.
 */
export function calculate(
  input: CTCInput,
  fy: FYRuleSet,
  tier: TierConfig
): CTCBreakdown {
  const monthlyCTC = input.proposedCTC / 12

  // ── Step 1: Gross salary percentage components ────────────────────────────
  const basic = Math.round(monthlyCTC * tier.basicPercent)
  const hra   = Math.round(basic * tier.hraPercent)
  const cca   = Math.round(basic * tier.ccaPercent)

  // ── Step 2: Fixed employer contributions (independent of gross) ───────────
  const employerPF =
    basic > fy.pfBasicThreshold
      ? fy.pfEmployerCap
      : Math.round(basic * fy.pfEmployerRate)

  const employerMedical = fy.medicalFixed
  const byod            = fy.byodFixed
  const gratuity        = Math.round(basic * fy.gratuityRate)
  const fixedEmployer   = employerPF + employerMedical + byod + gratuity

  // ── Step 3: Solve for Gross (employer ESI is a % of Gross — circular) ─────
  //
  //   CTC = Gross + fixedEmployer + employerESI
  //
  //   Case A — Gross > esiThreshold → ESI = 0
  //     Gross_A = monthlyCTC - fixedEmployer
  //
  //   Case B — Gross ≤ esiThreshold → ESI = Gross × esiRate
  //     CTC = Gross × (1 + esiRate) + fixedEmployer
  //     Gross_B = (monthlyCTC - fixedEmployer) / (1 + esiRate)
  //
  //   Pick Case A when Gross_A > threshold, else Case B.

  const grossIfNoESI = monthlyCTC - fixedEmployer
  const grossIfESI   = (monthlyCTC - fixedEmployer) / (1 + fy.esiEmployerRate)

  let grossSalary: number
  let employerESI: number

  if (grossIfNoESI > fy.esiGrossThreshold) {
    grossSalary = Math.round(grossIfNoESI)
    employerESI = 0
  } else {
    grossSalary = Math.round(grossIfESI)
    employerESI = Math.round(grossSalary * fy.esiEmployerRate)
  }

  // Special Allowance = residual after named components (clamped to 0)
  const specialAllowance = Math.max(0, grossSalary - basic - hra - cca)

  // ── Step 4: Employee deductions ───────────────────────────────────────────
  const employeePF =
    basic > fy.pfBasicThreshold
      ? fy.pfEmployeeCap
      : Math.round(basic * fy.pfEmployeeRate)

  const employeeESI =
    grossSalary > fy.esiGrossThreshold
      ? 0
      : Math.round(grossSalary * fy.esiEmployeeRate)

  const employeeMedical = fy.medicalFixed

  const professionalTax =
    grossSalary >= fy.ptGrossThreshold ? fy.ptAmount : 0

  const totalEmployeeDeduction =
    employeePF + employeeESI + employeeMedical + professionalTax

  const netSalary = grossSalary - totalEmployeeDeduction

  // ── Step 5: Totals ────────────────────────────────────────────────────────
  const totalEmployerContribution =
    employerPF + employerESI + employerMedical + byod + gratuity

  const actualCTC       = grossSalary + totalEmployerContribution
  const actualCTCAnnual = actualCTC * 12

  // ── Step 6: Extra SalaryComponents from tier ──────────────────────────────
  const extras: ExtraComponent[] = tier.extraComponents.map(comp => ({
    componentId: comp.id,
    label: comp.label,
    type: comp.type,
    amount: Math.round(evalComponent(comp, basic, grossSalary, monthlyCTC))
  }))

  return {
    input,
    basic,
    hra,
    cca,
    specialAllowance,
    grossSalary,
    employeePF,
    employeeESI,
    employeeMedical,
    professionalTax,
    totalEmployeeDeduction,
    netSalary,
    employerPF,
    employerESI,
    employerMedical,
    byod,
    gratuity,
    totalEmployerContribution,
    extras,
    actualCTC,
    actualCTCAnnual
  }
}
