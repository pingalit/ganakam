import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { registerStoreHandlers } from './ipc/store'
import { registerFileHandlers } from './ipc/file'
import { autoUpdater } from 'electron-updater'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerStoreHandlers()
  registerFileHandlers()
  registerUpdateHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── Auto-updater ─────────────────────────────────────────────────────────────

function registerUpdateHandlers(): void {
  // Only run in production — skip during dev (no GitHub release to check)
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true          // download silently in background
  autoUpdater.autoInstallOnAppQuit = true  // install when user quits

  // For private GitHub repos: release assets require authentication.
  // Set GANAKAM_GH_TOKEN at build time via electron-builder's extraMetadata,
  // or embed a read-only fine-grained PAT scoped only to release asset downloads.
  // For public repos this block is not needed.
  if (process.env['GH_TOKEN']) {
    autoUpdater.requestHeaders = { Authorization: `token ${process.env['GH_TOKEN']}` }
  }

  // Forward update events to the renderer so the UI can show a notification
  const send = (event: string, data?: unknown) => {
    BrowserWindow.getAllWindows().forEach(w =>
      w.webContents.send('updater:' + event, data)
    )
  }

  autoUpdater.on('checking-for-update',  () => send('checking'))
  autoUpdater.on('update-available',     info => send('available', info))
  autoUpdater.on('update-not-available', info => send('not-available', info))
  autoUpdater.on('download-progress',    p    => send('progress', p))
  autoUpdater.on('update-downloaded',    info => send('downloaded', info))
  autoUpdater.on('error',                err  => send('error', String(err)))

  // Renderer can trigger install-and-restart
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall())
  ipcMain.handle('updater:check',   () => autoUpdater.checkForUpdates())

  // Check on launch (5-second delay so the window is ready)
  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}
