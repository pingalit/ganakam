import { contextBridge, ipcRenderer } from 'electron'

const api = {
  db: {
    // FY Rules
    getFYRules:             ()              => ipcRenderer.invoke('store:getFYRules'),
    saveFYRule:             (r: unknown)    => ipcRenderer.invoke('store:saveFYRule', r),
    deleteFYRule:           (id: string)    => ipcRenderer.invoke('store:deleteFYRule', id),
    setActiveFY:            (id: string)    => ipcRenderer.invoke('store:setActiveFY', id),
    // Tiers
    getTiers:               ()              => ipcRenderer.invoke('store:getTiers'),
    saveTier:               (t: unknown)    => ipcRenderer.invoke('store:saveTier', t),
    deleteTier:             (id: string)    => ipcRenderer.invoke('store:deleteTier', id),
    reorderTiers:           (ids: string[]) => ipcRenderer.invoke('store:reorderTiers', ids),
    // Salary Components
    getSalaryComponents:    ()              => ipcRenderer.invoke('store:getSalaryComponents'),
    saveSalaryComponent:    (c: unknown)    => ipcRenderer.invoke('store:saveSalaryComponent', c),
    deleteSalaryComponent:  (id: string)    => ipcRenderer.invoke('store:deleteSalaryComponent', id),
    // History
    getHistory:             ()              => ipcRenderer.invoke('store:getHistory'),
    addHistory:             (e: unknown)    => ipcRenderer.invoke('store:addHistory', e),
    deleteHistory:          (id: string)    => ipcRenderer.invoke('store:deleteHistory', id),
    clearHistory:           ()              => ipcRenderer.invoke('store:clearHistory')
  },
  file: {
    savePDF: (opts: { defaultPath: string; buffer: number[] }) =>
      ipcRenderer.invoke('file:savePDF', opts),
    openCSV: () =>
      ipcRenderer.invoke('file:openCSV'),
    saveCSV: (opts: { defaultPath: string; content: string }) =>
      ipcRenderer.invoke('file:saveCSV', opts)
  },
  updater: {
    install: () => ipcRenderer.invoke('updater:install'),
    check:   () => ipcRenderer.invoke('updater:check')
  },
  // Subscribe to updater events from main process
  onUpdaterEvent: (callback: (event: string, data: unknown) => void) => {
    const events = [
      'updater:checking', 'updater:available', 'updater:not-available',
      'updater:progress', 'updater:downloaded', 'updater:error'
    ]
    events.forEach(ch => {
      ipcRenderer.on(ch, (_, data) => callback(ch.replace('updater:', ''), data))
    })
  },
  isElectron: true as const
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
