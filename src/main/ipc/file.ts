import { ipcMain, dialog } from 'electron'
import { writeFile, readFile } from 'fs/promises'

export function registerFileHandlers(): void {
  ipcMain.handle('file:savePDF', async (_, opts: { defaultPath: string; buffer: number[] }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: opts.defaultPath,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, Buffer.from(opts.buffer))
    return filePath
  })

  ipcMain.handle('file:openCSV', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      filters: [{ name: 'CSV File', extensions: ['csv'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return null
    const content = await readFile(filePaths[0], 'utf-8')
    return { path: filePaths[0], content }
  })

  ipcMain.handle('file:saveCSV', async (_, opts: { defaultPath: string; content: string }) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      defaultPath: opts.defaultPath,
      filters: [{ name: 'CSV File', extensions: ['csv'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, opts.content, 'utf-8')
    return filePath
  })
}
