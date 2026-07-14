import { Routes, Route, NavLink } from 'react-router-dom'
import { Settings } from 'lucide-react'
import FiscalYearsPage from './FiscalYears'
import TiersPage from './Tiers'
import ComponentsPage from './Components'

export default function SettingsPage() {
  const tabs = [
    { to: '/settings',            label: 'Fiscal Years', end: true },
    { to: '/settings/tiers',      label: 'Tiers' },
    { to: '/settings/components', label: 'Salary Components' }
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage fiscal years, tier configs, and salary components</p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Tab content */}
      <Routes>
        <Route index        element={<FiscalYearsPage />} />
        <Route path="tiers"      element={<TiersPage />} />
        <Route path="components" element={<ComponentsPage />} />
      </Routes>
    </div>
  )
}
