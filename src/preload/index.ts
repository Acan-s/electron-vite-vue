import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)

    // 向渲染进程暴露更新相关 API
    contextBridge.exposeInMainWorld('electronUpdate', {
      // 检查更新
      checkUpdate: () => ipcRenderer.invoke('update:check'),
      // 下载更新
      downloadUpdate: () => ipcRenderer.invoke('update:download'),
      // 取消下载
      cancelUpdate: () => ipcRenderer.invoke('update:cancel'),
      // 安装更新
      installUpdate: () => ipcRenderer.invoke('update:install'),
      // 监听更新事件
      onUpdateAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => {
        ipcRenderer.on('update:available', (_, info) => callback(info))
      },
      onUpdateNotAvailable: (callback: () => void) => {
        ipcRenderer.on('update:not-available', callback)
      },
      onUpdateProgress: (
        callback: (progress: { percent: number; transferred: number; total: number }) => void
      ) => {
        ipcRenderer.on('update:progress', (_, progress) => callback(progress))
      },
      onUpdateDownloaded: (callback: (info) => void) => {
        ipcRenderer.on('update:downloaded', (_, info) => callback(info))
      },
      onUpdateError: (callback: (errorMsg: string) => void) => {
        ipcRenderer.on('update:error', (_, errorMsg) => callback(errorMsg))
      },
      // 移除事件监听（避免内存泄漏）
      removeAllListeners: () => {
        ipcRenderer.removeAllListeners('update:available')
        ipcRenderer.removeAllListeners('update:not-available')
        ipcRenderer.removeAllListeners('update:progress')
        ipcRenderer.removeAllListeners('update:downloaded')
        ipcRenderer.removeAllListeners('update:error')
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
