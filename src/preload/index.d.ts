import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    electronUpdate: {
      checkUpdate: () => Promise<{
        success: boolean
        hasUpdate?: boolean
        version?: string
        releaseNotes?: string
        message?: string
      }>
      downloadUpdate: () => Promise<{ success: boolean; message?: string }>
      cancelUpdate: () => Promise<{ success: boolean; message?: string }>
      installUpdate: () => Promise<{ success: boolean }>
      onUpdateAvailable: (
        callback: (info: { version: string; releaseNotes: string }) => void
      ) => void
      onUpdateNotAvailable: (callback: () => void) => void
      onUpdateProgress: (
        callback: (progress: { percent: number; transferred: number; total: number }) => void
      ) => void
      onUpdateDownloaded: (callback: (info) => void) => void
      onUpdateError: (callback: (errorMsg: string) => void) => void
      removeAllListeners: () => void
    }
  }
}
