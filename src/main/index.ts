import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'

// ========== 新增：全局标记，防止重复初始化 ==========
let isUpdateHandlerRegistered = false // 标记IPC句柄是否已注册
let mainWindowInstance: BrowserWindow | null = null // 全局窗口实例

// 开启更新日志（调试用，发布时可注释）
autoUpdater.logger = console
autoUpdater.autoDownload = false // 关闭自动下载，手动控制
autoUpdater.allowPrerelease = false // 不允许预发布版本
autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装（如果用户选择稍后更新）

// 开发环境禁用自动更新
if (!app.isPackaged) {
  autoUpdater.updateConfigPath = join(__dirname, 'dev-app-update.yml')
}

// 监听更新相关事件，向渲染进程（Vue/React）发送状态
function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // ========== 核心修复1：只注册一次IPC句柄 ==========
  if (isUpdateHandlerRegistered) {
    // 若已注册，仅重新绑定事件到当前窗口（避免重复注册句柄）
    bindUpdateEventsToWindow(mainWindow)
    return
  }

  // ✅ 注册前先移除旧句柄（双重保险）
  ipcMain.removeHandler('update:check')
  ipcMain.removeHandler('update:download')
  ipcMain.removeHandler('update:install')

  // ✅ 注册 update:check 句柄（修复 TS7030 错误：所有分支都返回值）
  ipcMain.handle('update:check', async () => {
    try {
      // 开发环境禁用更新检查
      if (!app.isPackaged) {
        return {
          success: true,
          hasUpdate: false,
          message: '开发环境禁用更新检查'
        }
      }
      // 检查更新
      const updateInfo = await autoUpdater.checkForUpdates()
      console.log('await autoUpdater.checkForUpdates()', updateInfo)

      // ========== 确保这个分支有返回值（修复 TS7030） ==========
      return {
        success: true,
        hasUpdate: !!updateInfo?.updateInfo.version,
        version: updateInfo?.updateInfo.version,
        releaseNotes: updateInfo?.updateInfo.releaseNotes || '暂无更新说明'
      }
    } catch (err) {
      console.error('检查更新失败：', err)
      return {
        success: false,
        message: (err as Error).message || '检查更新失败，请检查网络'
      }
    }
  })

  // ✅ 注册 update:download 句柄
  ipcMain.handle('update:download', () => {
    autoUpdater.downloadUpdate()
    return { success: true, message: '开始下载更新包' }
  })

  // ✅ 注册 update:install 句柄
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  })

  // ========== 核心修复2：标记句柄已注册，避免重复执行 ==========
  isUpdateHandlerRegistered = true

  // 绑定更新事件到当前窗口
  bindUpdateEventsToWindow(mainWindow)
}

// ========== 新增：抽离事件绑定逻辑，单独处理窗口事件 ==========
function bindUpdateEventsToWindow(mainWindow: BrowserWindow): void {
  // 先移除旧的事件监听（避免重复触发）
  autoUpdater.removeAllListeners('update-available')
  autoUpdater.removeAllListeners('update-not-available')
  autoUpdater.removeAllListeners('download-progress')
  autoUpdater.removeAllListeners('update-downloaded')
  autoUpdater.removeAllListeners('error')

  // ========== 更新事件监听（绑定到主窗口） ==========
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:not-available')
  })

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('update:progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update:downloaded', info)
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '更新完成',
        message: `新版本 ${info.version} 已下载完成`,
        detail: '是否立即重启应用？',
        buttons: ['立即重启', '稍后重启']
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on('error', (err) => {
    const errorMsg = (err as Error).message || '更新失败'
    mainWindow.webContents.send('update:error', errorMsg)
    dialog.showErrorBox('更新失败', errorMsg)
  })
}

function createWindow(): void {
  // ========== 核心修复3：防止重复创建窗口 ==========
  if (mainWindowInstance) {
    mainWindowInstance.show()
    return
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 保存全局窗口实例
  mainWindowInstance = mainWindow

  // 窗口关闭时重置实例
  mainWindow.on('closed', () => {
    mainWindowInstance = null
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // 2. 窗口显示后检查更新
    setupAutoUpdater(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 为 macOS 设置桌面图标
  if (process.platform === 'darwin') {
    app.dock?.setIcon(icon)
  }

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
