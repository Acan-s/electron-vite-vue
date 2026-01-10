import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'

// 开发环境禁用自动更新
if (!app.isPackaged) {
  autoUpdater.updateConfigPath = join(__dirname, 'dev-app-update.yml')
}

// 监听更新相关事件，向渲染进程（Vue/React）发送状态
function setupAutoUpdater(mainWindow): void {
  // 1. 检查更新
  autoUpdater.checkForUpdates()

  // 2. 发现新版本
  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本：', info.version)
    // 向渲染进程发送“有新版本”的消息
    mainWindow.webContents.send('update-available', info)

    // 可选：弹窗提示用户更新
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: `有新版本 ${info.version} 可用，是否立即更新？`,
        buttons: ['立即更新', '稍后']
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate() // 确认更新，开始下载
        }
      })
  })

  // 3. 无新版本
  autoUpdater.on('update-not-available', (info) => {
    console.log('当前已是最新版本')
    mainWindow.webContents.send('update-not-available', info)
  })

  // 4. 下载进度
  autoUpdater.on('download-progress', (progressObj) => {
    // 发送下载进度（百分比、速度等）
    mainWindow.webContents.send('download-progress', progressObj)
  })

  // 5. 下载完成
  autoUpdater.on('update-downloaded', (info) => {
    console.log('update-downloaded:', info)

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: '更新完成',
        message: '更新已下载完成，是否立即重启应用？',
        buttons: ['立即重启', '稍后重启']
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall() // 重启并安装更新
        }
      })
  })

  // 6. 更新失败
  autoUpdater.on('error', (err) => {
    console.error('更新失败：', err)
    mainWindow.webContents.send('update-error', err.message)
    dialog.showErrorBox('更新失败', err.message || '请手动下载最新版本')
  })
}

function createWindow(): void {
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

  // 初始化自动更新
  setupAutoUpdater(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
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
