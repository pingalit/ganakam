import { useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { Calculator, Users, Clock, Settings } from 'lucide-react'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { useCalculatorStore } from '@renderer/store/calculatorStore'
import { UpdateBanner } from '@renderer/components/UpdateBanner'
import HomePage from '@renderer/pages/Home'
import BulkPage from '@renderer/pages/Bulk'
import HistoryPage from '@renderer/pages/History'
import SettingsPage from '@renderer/pages/Settings'

export default function App() {
  const { load, activeFY } = useSettingsStore()
  const { loadHistory } = useCalculatorStore()

  useEffect(() => {
    load()
    loadHistory()
  }, [])

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <nav className="w-56 flex-shrink-0 flex flex-col border-r border-border bg-card">
          {/* Brand */}
          <div className="px-4 py-4 border-b border-border drag-region">
            <h1 className="text-base font-bold text-primary leading-tight no-drag">Ganakam</h1>
            <p className="text-xs text-muted-foreground no-drag">CTC Calculator</p>
          </div>

          {/* Nav links */}
          <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            <SideNavLink to="/"       icon={<Calculator size={15} />} label="Calculator" end />
            <SideNavLink to="/bulk"   icon={<Users      size={15} />} label="Bulk" />
            <SideNavLink to="/history" icon={<Clock     size={15} />} label="History" />
          </div>

          {/* Bottom */}
          <div className="p-2 border-t border-border space-y-0.5">
            <SideNavLink to="/settings" icon={<Settings size={15} />} label="Settings" />
            {activeFY && (
              <div className="px-3 py-2">
                <span className="inline-flex items-center text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {activeFY.label}
                </span>
              </div>
            )}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"         element={<HomePage />} />
            <Route path="/bulk"     element={<BulkPage />} />
            <Route path="/history"  element={<HistoryPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {/* OTA update notification — only shows when an update is available */}
      <UpdateBanner />
    </HashRouter>
  )
}

function SideNavLink({
  to, icon, label, end
}: {
  to: string; icon: React.ReactNode; label: string; end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-foreground hover:bg-accent'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
