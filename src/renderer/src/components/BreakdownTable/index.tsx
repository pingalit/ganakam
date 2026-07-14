import type { CTCBreakdown } from '@renderer/core/types'
import { formatINR } from '@renderer/lib/inr'

interface Props {
  breakdown: CTCBreakdown
}

export function BreakdownTable({ breakdown: b }: Props) {
  const m = formatINR
  const a = (v: number) => formatINR(v * 12)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Summary header */}
      <div className="px-5 py-4 border-b border-border flex flex-wrap justify-between items-center gap-4 bg-primary/5">
        <div>
          <p className="font-semibold text-base">{b.input.name || 'Employee'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Annual CTC: <span className="font-medium text-foreground">{formatINR(b.input.proposedCTC)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary">{m(b.netSalary)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="text-xs text-muted-foreground">Net Take-Home</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-2.5 font-medium text-muted-foreground w-1/2">Component</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Monthly (₹)</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Annual (₹)</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Rule</th>
            </tr>
          </thead>
          <tbody>
            {/* Gross components */}
            <Section title="Gross Salary Components" />
            <Row label="Basic Salary"       monthly={m(b.basic)}            annual={a(b.basic)} />
            <Row label="HRA"                monthly={m(b.hra)}              annual={a(b.hra)} />
            {b.cca > 0 && (
              <Row label="CCA"              monthly={m(b.cca)}              annual={a(b.cca)} />
            )}
            {b.specialAllowance > 0 && (
              <Row label="Special Allowance" monthly={m(b.specialAllowance)} annual={a(b.specialAllowance)} />
            )}
            {b.extras.filter(e => e.type === 'gross_allowance').map(e => (
              <Row key={e.componentId} label={e.label} monthly={m(e.amount)} annual={a(e.amount)} />
            ))}
            <Total label="Gross Salary" monthly={m(b.grossSalary)} annual={a(b.grossSalary)} />

            {/* Employee deductions */}
            <Section title="Employee Deductions" />
            <Row
              label="Provident Fund"
              monthly={m(b.employeePF)}
              annual={a(b.employeePF)}
              rule={b.employeePF === 1800 ? 'Capped at ₹1,800' : '12% of Basic'}
            />
            {b.employeeESI > 0 && (
              <Row label="ESI" monthly={m(b.employeeESI)} annual={a(b.employeeESI)} rule="0.75% of Gross" />
            )}
            <Row label="Medical Insurance"  monthly={m(b.employeeMedical)}  annual={a(b.employeeMedical)} rule="Fixed" />
            {b.professionalTax > 0 && (
              <Row label="Professional Tax" monthly={m(b.professionalTax)}  annual={a(b.professionalTax)} rule="Gross ≥ ₹25,000" />
            )}
            {b.extras.filter(e => e.type === 'employee_deduction').map(e => (
              <Row key={e.componentId} label={e.label} monthly={m(e.amount)} annual={a(e.amount)} />
            ))}
            <Total label="Total Deductions" monthly={m(b.totalEmployeeDeduction)} annual={a(b.totalEmployeeDeduction)} />

            {/* Net salary highlight */}
            <NetRow label="Net Salary (Take-Home)" monthly={m(b.netSalary)} annual={a(b.netSalary)} />

            {/* Employer contributions */}
            <Section title="Employer Contributions" />
            <Row
              label="Provident Fund"
              monthly={m(b.employerPF)}
              annual={a(b.employerPF)}
              rule={b.employerPF === 1950 ? 'Capped at ₹1,950' : '13% of Basic'}
            />
            {b.employerESI > 0 && (
              <Row label="ESI" monthly={m(b.employerESI)} annual={a(b.employerESI)} rule="3.25% of Gross" />
            )}
            <Row label="Medical Insurance" monthly={m(b.employerMedical)} annual={a(b.employerMedical)} rule="Fixed" />
            <Row label="BYOD"              monthly={m(b.byod)}            annual={a(b.byod)}            rule="Device allowance" />
            <Row label="Gratuity"          monthly={m(b.gratuity)}        annual={a(b.gratuity)}        rule="4.81% of Basic" />
            {b.extras.filter(e => e.type === 'employer_contribution').map(e => (
              <Row key={e.componentId} label={e.label} monthly={m(e.amount)} annual={a(e.amount)} />
            ))}
            <Total label="Total Employer Contribution" monthly={m(b.totalEmployerContribution)} annual={a(b.totalEmployerContribution)} />

            {/* Actual CTC */}
            <Total
              label="Actual CTC"
              monthly={m(b.actualCTC)}
              annual={formatINR(b.actualCTCAnnual)}
              highlight
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <tr className="bg-muted/20 border-t border-border">
      <td colSpan={4} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </td>
    </tr>
  )
}

function Row({ label, monthly, annual, rule }: {
  label: string; monthly: string; annual: string; rule?: string
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-muted/20 transition-colors">
      <td className="px-5 py-2.5">{label}</td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{monthly}</td>
      <td className="px-4 py-2.5 text-right font-mono tabular-nums">{annual}</td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">{rule ?? ''}</td>
    </tr>
  )
}

function Total({ label, monthly, annual, highlight }: {
  label: string; monthly: string; annual: string; highlight?: boolean
}) {
  const cls = highlight
    ? 'bg-primary/8 text-primary'
    : 'bg-muted/40 text-foreground'
  return (
    <tr className={`border-t-2 border-border ${cls}`}>
      <td className="px-5 py-2.5 font-semibold">{label}</td>
      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{monthly}</td>
      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{annual}</td>
      <td className="hidden lg:table-cell"></td>
    </tr>
  )
}

function NetRow({ label, monthly, annual }: { label: string; monthly: string; annual: string }) {
  return (
    <tr className="border-t-2 border-primary/40 bg-primary/5">
      <td className="px-5 py-3 font-bold text-primary">{label}</td>
      <td className="px-4 py-3 text-right font-mono font-bold text-primary text-base tabular-nums">{monthly}</td>
      <td className="px-4 py-3 text-right font-mono font-bold text-primary tabular-nums">{annual}</td>
      <td className="hidden lg:table-cell"></td>
    </tr>
  )
}
