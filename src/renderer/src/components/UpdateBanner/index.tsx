import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

interface UpdateInfo { version: string }
interface ProgressInfo { percent: number }

type UpdateState =
  | { status: 'idle' }
  | { status: 'available';   info: UpdateInfo }
  | { status: 'downloading'; progress: ProgressInfo }
  | { status: 'downloaded';  info: UpdateInfo }
  | { status: 'error';       message: string }

const isElectron = typeof window !== 'undefined' && (window as any).api?.isElectron

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    ;(window as any).api.onUpdaterEvent((event: string, data: any) => {
      switch (event) {
        case 'available':     setState({ status: 'available',   info: data });             break
        case 'progress':      setState({ status: 'downloading', progress: data });          break
        case 'downloaded':    setState({ status: 'downloaded',  info: data });             break
        case 'error':         setState({ status: 'error',       message: String(data) });  break
        case 'not-available':
        case 'checking':      break
      }
    })
  }, [])

  if (dismissed || state.status === 'idle') return null

  const handleInstall = () => (window as any).api.updater.install()

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-card border border-border rounded-lg shadow-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {state.status === 'available' && (
            <>
              <p className="text-sm font-semibold">Update available — v{state.info.version}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Downloading in background…</p>
            </>
          )}
          {state.status === 'downloading' && (
            <>
              <p className="text-sm font-semibold">Downloading update…</p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(state.progress.percent)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{Math.round(state.progress.percent)}%</p>
            </>
          )}
          {state.status === 'downloaded' && (
            <>
              <p className="text-sm font-semibold">v{state.info.version} ready to install</p>
              <p className="text-xs text-muted-foreground mt-0.5">Restart to apply the update.</p>
              <button onClick={handleInstall} className="btn-primary mt-2 text-xs py-1.5 px-3 flex items-center gap-1.5">
                <RefreshCw size={12} /> Restart &amp; Install
              </button>
            </>
          )}
          {state.status === 'error' && (
            <p className="text-sm text-destructive">Update error: {state.message}</p>
          )}
        </div>
        {state.status !== 'downloading' && (
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
