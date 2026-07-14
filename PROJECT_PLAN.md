# Ganakam — CTC Calculator for Indian Financials

> A cross-platform desktop app (Electron) for calculating and managing CTC breakdowns, generating appointment letter annexures, and processing bulk employee salary data. Built for Indian statutory compliance (PF, ESI, PT, Gratuity).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Domain Model](#domain-model)
4. [Calculation Engine](#calculation-engine)
5. [Settings System](#settings-system)
6. [Feature Phases](#feature-phases)
7. [Build & Run](#build--run)
8. [Testing Strategy](#testing-strategy)
9. [Reference: Excel Mapping](#reference-excel-mapping)

---

## Tech Stack

| Layer | Library | Purpose |
|---|---|---|
| UI | React 18 + TypeScript | Component-based UI, same code for Electron + browser |
| Build | Vite + vite-plugin-electron | Fast dev HMR, dual Electron/web targets |
| Desktop | Electron | Windows + Mac packaging |
| Styling | Tailwind CSS + shadcn/ui | Clean financial UI components |
| State | Zustand | Lightweight global store |
| PDF | @react-pdf/renderer | Appointment letter annexure generation |
| Database | better-sqlite3 | Local persistence (history, settings) — Electron main process only |
| Testing | Vitest + Playwright | Unit tests for calc engine + E2E UI tests |
| Packaging | electron-builder | `.exe` (Windows NSIS), `.dmg` (macOS) installers |

---

## Project Structure

```
ganakam/
├── example/
│   └── Calculation CTC FY 26-27.xlsx     # Reference Excel — source of truth for rules
│
├── src/
│   ├── core/                              # Pure business logic — zero UI dependencies
│   │   ├── types.ts                       # All domain types
│   │   ├── defaults.ts                    # Seed data: FY26-27 rules + Tier 1/2/3 configs
│   │   ├── engine.ts                      # Calculator: takes CTCInput + config → CTCBreakdown
│   │   ├── rules/
│   │   │   └── FY26-27.ts                 # Statutory thresholds for FY 2026-27
│   │   └── engine.test.ts                 # Vitest unit tests (validated against Excel values)
│   │
│   ├── components/
│   │   ├── TierSelector/                  # Tier 1/2/3 + custom tier dropdown
│   │   ├── Calculator/                    # CTC input form + live breakdown
│   │   ├── BreakdownTable/                # Monthly / Annual salary breakdown table
│   │   ├── BulkTable/                     # Results grid for batch mode
│   │   └── FYBadge/                       # Active fiscal year indicator (shown in header)
│   │
│   ├── pages/
│   │   ├── Home.tsx                       # Single-employee calculator
│   │   ├── Bulk.tsx                       # CSV upload → batch process → export
│   │   ├── History.tsx                    # Saved calculations (SQLite)
│   │   └── Settings/
│   │       ├── index.tsx                  # Tab container
│   │       ├── FiscalYears.tsx            # CRUD for FY rule sets
│   │       ├── Tiers.tsx                  # CRUD for tier configs
│   │       └── Components.tsx             # CRUD for custom salary components
│   │
│   ├── pdf/
│   │   └── AnnexureTemplate.tsx           # react-pdf: 41-field monthly + annual template
│   │
│   ├── store/
│   │   ├── calculatorStore.ts             # Current single-employee calculation state
│   │   ├── bulkStore.ts                   # Batch job state
│   │   └── settingsStore.ts               # Active FY + tier configs (loaded from SQLite)
│   │
│   └── lib/
│       ├── inr.ts                         # ₹ formatting, rounding helpers
│       └── csv.ts                         # CSV parse/serialize for bulk import/export
│
├── electron/
│   ├── main.ts                            # BrowserWindow setup, app lifecycle
│   ├── preload.ts                         # contextBridge — typed IPC API (no nodeIntegration)
│   └── ipc/
│       ├── file.ts                        # IPC: saveFile, openFile (PDF, CSV) via native dialog
│       └── db.ts                          # IPC: SQLite read/write (history + settings)
│
├── tests/
│   ├── core/engine.test.ts                # Unit tests against known Excel reference values
│   └── e2e/calculator.spec.ts             # Playwright E2E tests
│
├── package.json
├── vite.config.ts
├── electron-builder.config.ts
└── tailwind.config.ts
```

---

## Domain Model

### Types (`src/core/types.ts`)

```typescript
// Input to the calculator
interface CTCInput {
  name: string;
  proposedCTC: number;          // annual CTC in ₹
  tierId: string;               // references TierConfig.id
  fyId: string;                 // references FYRuleSet.id
}

// Full calculated breakdown (monthly + annual)
interface CTCBreakdown {
  input: CTCInput;

  // Gross salary components (monthly)
  basic: number;
  hra: number;
  cca: number;
  specialAllowance: number;
  grossSalary: number;

  // Employee deductions (monthly)
  employeePF: number;
  employeeESI: number;
  employeeMedical: number;
  professionalTax: number;
  totalEmployeeDeduction: number;
  netSalary: number;            // take-home

  // Employer contributions (monthly)
  employerPF: number;
  employerESI: number;
  employerMedical: number;
  byod: number;
  gratuity: number;
  totalEmployerContribution: number;

  // Custom components (from SalaryComponent[])
  extras: { componentId: string; label: string; amount: number }[];

  actualCTC: number;            // Gross + Employer Contributions (monthly)
  actualCTCAnnual: number;      // × 12
}

// Statutory rules for one fiscal year
interface FYRuleSet {
  id: string;                   // "FY26-27"
  label: string;                // "FY 2026–27"
  isActive: boolean;

  esiGrossThreshold: number;    // 21000
  esiEmployeeRate: number;      // 0.0075
  esiEmployerRate: number;      // 0.0325

  pfBasicThreshold: number;     // 15000
  pfEmployeeRate: number;       // 0.12
  pfEmployeeCap: number;        // 1800
  pfEmployerRate: number;       // 0.13
  pfEmployerCap: number;        // 1950

  ptGrossThreshold: number;     // 25000
  ptAmount: number;             // 200

  medicalFixed: number;         // 462
  byodFixed: number;            // 1500
  gratuityRate: number;         // 0.0481
}

// Tier salary structure
interface TierConfig {
  id: string;                   // "tier1" | "tier2" | "tier3" | uuid
  label: string;                // "Tier 1" | custom name
  basicPercent: number;         // 0.50 — of annual CTC
  hraPercent: number;           // of Basic: 0.50 / 0.40 / 0.35
  ccaPercent: number;           // of Basic: 0.20 / 0.10 / 0.00
  extraComponents: SalaryComponent[];
}

// Custom salary component (allowance, deduction, or employer contribution)
interface SalaryComponent {
  id: string;
  label: string;
  type: 'gross_allowance' | 'employee_deduction' | 'employer_contribution';
  basis: 'fixed' | 'pct_of_basic' | 'pct_of_gross' | 'pct_of_ctc';
  value: number;
  condition?: {
    field: 'basic' | 'gross' | 'ctc';
    operator: '>=' | '>' | '<=' | '<';
    threshold: number;
    belowValue: number;         // value used when condition is false
  };
  applyMonthly: boolean;
  includeInPdf: boolean;
}
```

---

## Calculation Engine

All math lives in `src/core/engine.ts`. It takes a `CTCInput` + active `FYRuleSet` + `TierConfig` and returns a `CTCBreakdown`. No UI, no side effects.

### Algorithm

```
// Monthly CTC = proposedCTC / 12
monthlyCTC = proposedCTC / 12

// Step 1 — Gross salary component percentages
basic         = monthlyCTC × tier.basicPercent
hra           = basic × tier.hraPercent
cca           = basic × tier.ccaPercent

// Step 2 — Employer contributions (fixed/formula, not salary)
employerPF    = basic > fy.pfBasicThreshold
                  ? fy.pfEmployerCap                   // ₹1,950
                  : basic × fy.pfEmployerRate           // 13% of basic
employerESI   = gross > fy.esiGrossThreshold
                  ? 0
                  : gross × fy.esiEmployerRate          // 3.25%
employerMed   = fy.medicalFixed                        // ₹462
byod          = fy.byodFixed                           // ₹1,500
gratuity      = basic × fy.gratuityRate                // 4.81%
totalEmployer = employerPF + employerESI + employerMed + byod + gratuity

// Step 3 — Solve for Special Allowance
// CTC = Gross + totalEmployer
// Gross = basic + hra + cca + specialAllowance
// Therefore:
specialAllowance = monthlyCTC - totalEmployer - basic - hra - cca
grossSalary      = basic + hra + cca + specialAllowance  // = monthlyCTC - totalEmployer

// Step 4 — Employee deductions (now that gross is known)
employeePF    = basic > fy.pfBasicThreshold
                  ? fy.pfEmployeeCap                   // ₹1,800
                  : basic × fy.pfEmployeeRate           // 12%
employeeESI   = grossSalary > fy.esiGrossThreshold
                  ? 0
                  : grossSalary × fy.esiEmployeeRate    // 0.75%
employeeMed   = fy.medicalFixed                        // ₹462
profTax       = grossSalary >= fy.ptGrossThreshold
                  ? fy.ptAmount                         // ₹200
                  : 0
totalDeduction = employeePF + employeeESI + employeeMed + profTax

// Step 5 — Net salary
netSalary     = grossSalary - totalDeduction

// Step 6 — Apply any extra SalaryComponents from the tier
// (evaluated against the computed basic/gross/ctc values)
```

### Default Tier Configs (FY 2026-27 seed data)

| | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Basic | 50% of CTC | 50% of CTC | 50% of CTC |
| HRA | 50% of Basic | 40% of Basic | 35% of Basic |
| CCA | 20% of Basic | 10% of Basic | 0% |

### Default Statutory Values (FY 2026-27)

| Rule | Value |
|---|---|
| ESI Gross Threshold | ₹21,000/month |
| ESI Employee Rate | 0.75% of Gross |
| ESI Employer Rate | 3.25% of Gross |
| PF Basic Threshold | ₹15,000/month |
| Employee PF Rate | 12% of Basic (cap ₹1,800) |
| Employer PF Rate | 13% of Basic (cap ₹1,950) |
| Professional Tax | ₹200 if Gross ≥ ₹25,000 |
| Medical (fixed) | ₹462/month |
| BYOD | ₹1,500/month |
| Gratuity | 4.81% of Basic |

---

## Settings System

### Settings Page — Three Tabs

#### Tab 1: Fiscal Years
- Table of all FYs with Name, Active badge, Edit / Clone / Delete actions
- **Add FY**: pre-fills from the currently active FY — user only changes what changed
- Setting a new FY as active immediately hot-reloads the calculator and bulk engine
- Active FY is shown as a badge in the app header at all times

**Add FY form fields:**
```
Fiscal Year ID:         FY27-28
Label:                  FY 2027–28

ESI Gross Threshold:    ₹ [21000]
ESI Employee Rate:      [0.75] %
ESI Employer Rate:      [3.25] %

PF Basic Threshold:     ₹ [15000]
PF Employee Rate:       [12] %    Cap: ₹ [1800]
PF Employer Rate:       [13] %    Cap: ₹ [1950]

Professional Tax:       ₹ [200]   if Gross ≥ ₹ [25000]
Medical (fixed/month):  ₹ [462]
BYOD (fixed/month):     ₹ [1500]
Gratuity Rate:          [4.81] %
```

#### Tab 2: Tiers
- Cards for each tier with inline-editable percentages
- **Add Tier**: custom name, basic %, HRA %, CCA %
- Assign extra salary components per tier
- Drag-to-reorder display order in dropdowns

#### Tab 3: Salary Components
- Global library of custom salary components
- **Add Component** modal:
  - Label, type (Allowance / Employee Deduction / Employer Contribution)
  - Basis: Fixed ₹ / % of Basic / % of Gross / % of CTC
  - Value
  - Optional condition: `if [basic|gross|ctc] [≥|>|≤|<] threshold → value, else → belowValue`
  - Toggle: Include in PDF annexure
- Components can be assigned to specific tiers or set as global

> **Zero code changes needed** to add new salary components, update statutory rates for a new FY, or create a new company salary band.

---

## Feature Phases

### Phase 1 — Calculator Core + UI
- [ ] Scaffold: Electron + React + Vite + TypeScript
- [ ] `src/core/engine.ts` — full calculation engine
- [ ] `src/core/engine.test.ts` — unit tests validated against Excel reference values
  - e.g. CTC ₹20,000 → Tier 3 → Net ₹11,708/month
  - e.g. CTC ₹30,000 → Tier 1 → Net ₹25,500/month
- [ ] Single-employee form with live breakdown table (monthly + annual toggle)
- [ ] Tier selector
- [ ] FY badge in header

### Phase 2 — Settings
- [ ] SQLite schema + migrations (via `better-sqlite3`)
- [ ] Seed database with FY26-27 defaults on first launch
- [ ] Settings page: Fiscal Years tab (CRUD)
- [ ] Settings page: Tiers tab (CRUD + reorder)
- [ ] Settings page: Salary Components tab (CRUD)
- [ ] Hot-reload calculator on settings change

### Phase 3 — PDF Export
- [ ] `AnnexureTemplate.tsx` — react-pdf template with all 41 `LettersData` fields
- [ ] Monthly + Annual figures rendered in the PDF
- [ ] In-app preview pane before saving
- [ ] Electron IPC: save PDF to user-chosen path via native dialog

### Phase 4 — Bulk Processing
- [ ] CSV upload: columns `Name, CTC, Tier` (validated on import)
- [ ] Batch calculate → results table (sortable, filterable)
- [ ] Export: individual PDFs to a folder, or all in a ZIP
- [ ] Export: summary CSV of all breakdowns

### Phase 5 — History
- [ ] Save each calculation to SQLite with timestamp
- [ ] History page: searchable, sortable table
- [ ] Re-open any past calculation (restores input + FY snapshot)
- [ ] Delete individual records or clear all

---

## Build & Run

### Prerequisites
- Node.js 20+
- npm 10+

### Dev Setup
```bash
git clone <repo>
cd ganakam
npm install
npm run dev          # starts Electron + Vite HMR
```

### Web-only Dev (no Electron)
```bash
npm run dev:web      # browser at http://localhost:5173
```

### Build
```bash
npm run build        # Vite production build
npm run dist         # electron-builder → dist/ with .exe and .dmg
```

### Test
```bash
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E (requires built app)
```

---

## Testing Strategy

### Unit Tests (`src/core/engine.test.ts`)
Every test case is cross-referenced against the Excel lookup tables as ground truth.

```
CTC ₹10,000  Tier 3  → Net ₹7,715   (Excel Tier 3, row 1)
CTC ₹20,000  Tier 3  → Net ₹11,708  (Updated Calculator sheet, Shrutha example)
CTC ₹30,000  Tier 1  → Net ₹25,500  (Excel Tier 1, row ~)
CTC ₹50,000  Tier 2  → Net ₹45,500  (Excel Tier 2, row ~)
ESI cutoff: CTC that puts Gross just above ₹21,000
PF cap: CTC that puts Basic just above ₹15,000
PT threshold: Gross exactly ₹25,000
```

### E2E Tests (Playwright)
- Type CTC → verify breakdown matches known values
- Change tier → verify recalculation
- Add new FY → set active → verify calculator uses new rates
- Upload CSV → verify bulk results table
- Export PDF → verify file created on disk

---

## Reference: Excel Mapping

| Excel Sheet | App Equivalent |
|---|---|
| `Tier 1` | Lookup validation data for unit tests |
| `Tier 2` | Lookup validation data for unit tests |
| `Tier 3` | Lookup validation data for unit tests |
| `Updated Calculator` | `Home.tsx` — single employee calculator |
| `LettersData` | `AnnexureTemplate.tsx` — 41 fields (M_ and A_ prefixes = monthly/annual) |
| `UPGRADED_autoCrat_MergeData_DO_` | `Bulk.tsx` — batch processing output |

### LettersData Fields (PDF Annexure — 41 columns)

| Prefix | Component |
|---|---|
| `M_BASIC` / `A_BASIC` | Basic Salary (monthly / annual) |
| `M_HRA` / `A_HRA` | HRA |
| `M_CCA` / `A_CCA` | CCA |
| `M_SPLALL` / `A_SPLALL` | Special Allowance |
| `M_GPAY` / `A_GPAY` | Gross Pay |
| `EE_M_PF` / `EE_A_PF` | Employee PF |
| `EE_M_ESI` / `EE_A_ESI` | Employee ESI |
| `EE_M_MI` / `EE_A_MI` | Employee Medical Insurance |
| `EE_M_PT` / `EE_A_PT` | Professional Tax |
| `EE_M_DED` / `EE_A_DED` | Total Employee Deduction |
| `EE_M_NPAY` / `EE_A_NPAY` | Net Pay (Take Home) |
| `ER_M_PF` / `ER_A_PF` | Employer PF |
| `ER_M_ESI` / `ER_A_ESI` | Employer ESI |
| `ER_M_MI` / `ER_A_MI` | Employer Medical Insurance |
| `ER_M_GY` / `ER_A_GY` | Gratuity |
| `ER_M_BD` / `ER_A_BD` | BYOD |
| `ER_M_CON` / `ER_A_CON` | Total Employer Contribution |
| `ER_M_CTC` / `ER_A_CTC` | Actual CTC |
