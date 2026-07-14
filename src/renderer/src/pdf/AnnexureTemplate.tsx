import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { CTCBreakdown, FYRuleSet } from '@renderer/core/types'

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    paddingHorizontal: 40,
    paddingVertical: 36,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a2e'
  },
  // Header
  header: { marginBottom: 20 },
  appTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2563eb', marginBottom: 2 },
  docTitle: { fontSize: 11, color: '#374151', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 24 },
  metaLabel: { color: '#6b7280', fontSize: 8 },
  metaValue: { fontFamily: 'Helvetica-Bold', fontSize: 9 },

  // Section heading
  section: { marginTop: 14, marginBottom: 4 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#6b7280',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb'
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db'
  },
  netRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: '#eff6ff',
    borderTopWidth: 1.5,
    borderTopColor: '#2563eb'
  },
  ctcRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: '#f0fdf4',
    borderTopWidth: 1.5,
    borderTopColor: '#16a34a',
    marginTop: 2
  },

  colLabel: { flex: 1 },
  colMon: { width: 70, textAlign: 'right' },
  colAnn: { width: 80, textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: '#6b7280' },
  primary: { color: '#2563eb' },
  success: { color: '#16a34a' },
  hdr: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#374151' },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
    color: '#9ca3af',
    fontSize: 7
  }
})

// ─── Helper formatters ────────────────────────────────────────────────────────

function inr(v: number): string {
  return '₹ ' + Math.round(v).toLocaleString('en-IN')
}

// ─── Row components ───────────────────────────────────────────────────────────

function TRow({ label, m, a, isBold }: { label: string; m: number; a: number; isBold?: boolean }) {
  return (
    <View style={S.row}>
      <Text style={[S.colLabel, isBold ? S.bold : {}]}>{label}</Text>
      <Text style={[S.colMon, isBold ? S.bold : {}]}>{inr(m)}</Text>
      <Text style={[S.colAnn, isBold ? S.bold : {}]}>{inr(a)}</Text>
    </View>
  )
}

function TotalRow({ label, m, a }: { label: string; m: number; a: number }) {
  return (
    <View style={S.totalRow}>
      <Text style={[S.colLabel, S.bold]}>{label}</Text>
      <Text style={[S.colMon, S.bold]}>{inr(m)}</Text>
      <Text style={[S.colAnn, S.bold]}>{inr(a)}</Text>
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

interface Props {
  breakdown: CTCBreakdown
  fy: FYRuleSet
}

export function AnnexureDocument({ breakdown: b, fy }: Props) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  return (
    <Document title={`Salary Annexure — ${b.input.name}`}>
      <Page size="A4" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <Text style={S.appTitle}>Ganakam</Text>
          <Text style={S.docTitle}>Salary Components Annexure</Text>
          <View style={S.metaRow}>
            <View>
              <Text style={S.metaLabel}>Employee</Text>
              <Text style={S.metaValue}>{b.input.name || '—'}</Text>
            </View>
            <View>
              <Text style={S.metaLabel}>Fiscal Year</Text>
              <Text style={S.metaValue}>{fy.label}</Text>
            </View>
            <View>
              <Text style={S.metaLabel}>Proposed Annual CTC</Text>
              <Text style={S.metaValue}>{inr(b.input.proposedCTC)}</Text>
            </View>
            <View>
              <Text style={S.metaLabel}>Date</Text>
              <Text style={S.metaValue}>{today}</Text>
            </View>
          </View>
        </View>

        {/* Column headers */}
        <View style={S.tableHeader}>
          <Text style={[S.colLabel, S.hdr]}>Component</Text>
          <Text style={[S.colMon, S.hdr]}>Monthly (₹)</Text>
          <Text style={[S.colAnn, S.hdr]}>Annual (₹)</Text>
        </View>

        {/* ── Gross Salary Components ── */}
        <View style={S.section}><Text style={S.sectionTitle}>Gross Salary Components</Text></View>
        <TRow label="Basic Salary"       m={b.basic}            a={b.basic * 12} />
        <TRow label="House Rent Allowance (HRA)" m={b.hra}     a={b.hra * 12} />
        {b.cca > 0 && (
          <TRow label="City Compensatory Allowance (CCA)" m={b.cca} a={b.cca * 12} />
        )}
        {b.specialAllowance > 0 && (
          <TRow label="Special Allowance" m={b.specialAllowance} a={b.specialAllowance * 12} />
        )}
        {b.extras.filter(e => e.type === 'gross_allowance' && e.amount > 0).map(e => (
          <TRow key={e.componentId} label={e.label} m={e.amount} a={e.amount * 12} />
        ))}
        <TotalRow label="Gross Salary" m={b.grossSalary} a={b.grossSalary * 12} />

        {/* ── Employee Deductions ── */}
        <View style={S.section}><Text style={S.sectionTitle}>Employee Deductions</Text></View>
        <TRow label="Provident Fund (Employee)" m={b.employeePF}      a={b.employeePF * 12} />
        {b.employeeESI > 0 && (
          <TRow label="Employee State Insurance (Employee)" m={b.employeeESI} a={b.employeeESI * 12} />
        )}
        <TRow label="Medical Insurance" m={b.employeeMedical} a={b.employeeMedical * 12} />
        {b.professionalTax > 0 && (
          <TRow label="Professional Tax" m={b.professionalTax} a={b.professionalTax * 12} />
        )}
        {b.extras.filter(e => e.type === 'employee_deduction' && e.amount > 0).map(e => (
          <TRow key={e.componentId} label={e.label} m={e.amount} a={e.amount * 12} />
        ))}
        <TotalRow label="Total Employee Deductions" m={b.totalEmployeeDeduction} a={b.totalEmployeeDeduction * 12} />

        {/* Net Salary */}
        <View style={S.netRow}>
          <Text style={[S.colLabel, S.bold, S.primary]}>Net Salary (Take-Home)</Text>
          <Text style={[S.colMon, S.bold, S.primary]}>{inr(b.netSalary)}</Text>
          <Text style={[S.colAnn, S.bold, S.primary]}>{inr(b.netSalary * 12)}</Text>
        </View>

        {/* ── Employer Contributions ── */}
        <View style={S.section}><Text style={S.sectionTitle}>Employer Contributions</Text></View>
        <TRow label="Provident Fund (Employer)" m={b.employerPF}      a={b.employerPF * 12} />
        {b.employerESI > 0 && (
          <TRow label="Employee State Insurance (Employer)" m={b.employerESI} a={b.employerESI * 12} />
        )}
        <TRow label="Medical Insurance"          m={b.employerMedical} a={b.employerMedical * 12} />
        <TRow label="BYOD (Device Allowance)"    m={b.byod}            a={b.byod * 12} />
        <TRow label="Gratuity"                   m={b.gratuity}        a={b.gratuity * 12} />
        {b.extras.filter(e => e.type === 'employer_contribution' && e.amount > 0).map(e => (
          <TRow key={e.componentId} label={e.label} m={e.amount} a={e.amount * 12} />
        ))}
        <TotalRow label="Total Employer Contributions" m={b.totalEmployerContribution} a={b.totalEmployerContribution * 12} />

        {/* Actual CTC */}
        <View style={S.ctcRow}>
          <Text style={[S.colLabel, S.bold, S.success]}>Actual CTC</Text>
          <Text style={[S.colMon, S.bold, S.success]}>{inr(b.actualCTC)}</Text>
          <Text style={[S.colAnn, S.bold, S.success]}>{inr(b.actualCTCAnnual)}</Text>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text>Generated by Ganakam · {fy.label}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}
