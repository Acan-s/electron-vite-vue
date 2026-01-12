/**
 * 主进程入口文件
 * 负责应用程序的初始化、窗口创建和自动更新等核心功能
 */

// 导入所需模块
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'

/**
 * 全局变量
 * @isUpdateHandlerRegistered - 标记更新处理器是否已注册
 * @mainWindowInstance - 全局窗口实例引用
 */
let isUpdateHandlerRegistered = false
let mainWindowInstance: BrowserWindow | null = null

/**
 * 自动更新配置
 * - 启用控制台日志
 * - 禁用自动下载，手动控制
 * - 禁用预发布版本
 * - 退出时自动安装更新
 */
autoUpdater.logger = console
autoUpdater.autoDownload = false
autoUpdater.allowPrerelease = false
autoUpdater.autoInstallOnAppQuit = true

/**
 * 检查更新函数
 * @returns {Promise<Object>} - 检查结果对象
 * @description 执行实际的更新检查操作，返回检查结果
 */
async function checkForUpdates(): Promise<{
  success: boolean
  hasUpdate?: boolean
  version?: string
  releaseNotes?: string
  message?: string
}> {
  try {
    // 开发环境禁用更新检查
    if (!app.isPackaged) {
      return {
        success: true,
        hasUpdate: false,
        message: '开发环境禁用更新检查'
      }
    }

    // 调用自动更新器检查更新
    const updateInfo = await autoUpdater.checkForUpdates()
    console.log('检查更新结果：', updateInfo)

    // 处理 releaseNotes 类型（可能是字符串或数组）
    let releaseNotesText = '暂无更新说明'
    if (updateInfo?.updateInfo.releaseNotes) {
      releaseNotesText = Array.isArray(updateInfo.updateInfo.releaseNotes)
        ? updateInfo.updateInfo.releaseNotes.join('\n')
        : updateInfo.updateInfo.releaseNotes
    }

    // 返回检查结果
    return {
      success: true,
      hasUpdate: !!updateInfo?.updateInfo.version,
      version: updateInfo?.updateInfo.version,
      releaseNotes: releaseNotesText
    }
  } catch (err) {
    console.error('检查更新失败：', err)
    return {
      success: false,
      message: (err as Error).message || '检查更新失败，请检查网络'
    }
  }
}

/**
 * 绑定更新事件到窗口
 * @param {BrowserWindow} mainWindow - 主窗口实例
 * @description 绑定自动更新相关的事件监听器，处理更新过程中的各种事件
 */
function bindUpdateEvents(mainWindow: BrowserWindow): void {
  // 移除旧的事件监听，避免重复触发
  autoUpdater.removeAllListeners('update-available')
  autoUpdater.removeAllListeners('update-not-available')
  autoUpdater.removeAllListeners('download-progress')
  autoUpdater.removeAllListeners('update-downloaded')
  autoUpdater.removeAllListeners('error')

  // 更新事件监听
  autoUpdater.on('update-available', (info) => {
    // 发现新版本，通知渲染进程
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', () => {
    // 无新版本，通知渲染进程
    mainWindow.webContents.send('update:not-available')
  })

  autoUpdater.on('download-progress', (progressObj) => {
    // 下载进度更新，通知渲染进程
    mainWindow.webContents.send('update:progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    // 更新下载完成，通知渲染进程并显示对话框
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
    // 更新失败，通知渲染进程并显示错误对话框
    const errorMsg = (err as Error).message || '更新失败'
    mainWindow.webContents.send('update:error', errorMsg)
    dialog.showErrorBox('更新失败', errorMsg)
  })
}

/**
 * 设置自动更新
 * @param {BrowserWindow} mainWindow - 主窗口实例
 * @description 初始化自动更新系统，注册IPC句柄和事件监听器
 */
function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // 如果已经注册过，只重新绑定事件
  if (isUpdateHandlerRegistered) {
    bindUpdateEvents(mainWindow)
    return
  }

  // 注册 IPC 句柄，供渲染进程调用
  ipcMain.handle('update:check', checkForUpdates)

  ipcMain.handle('update:download', () => {
    autoUpdater.downloadUpdate()
    return { success: true, message: '开始下载更新包' }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  })

  // 标记已注册，避免重复执行
  isUpdateHandlerRegistered = true
  // 绑定更新事件
  bindUpdateEvents(mainWindow)
}

/**
 * 创建窗口
 * @description 创建应用程序主窗口，设置窗口属性和事件处理
 */
function createWindow(): void {
  // 如果窗口已存在，直接显示
  if (mainWindowInstance) {
    mainWindowInstance.show()
    return
  }

  // 创建新窗口
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false, // 先隐藏，ready-to-show 时再显示
    autoHideMenuBar: true, // 自动隐藏菜单栏
    ...(process.platform === 'linux' ? { icon } : {}), // Linux 平台设置图标
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'), // 预加载脚本
      sandbox: false // 禁用沙箱，以便使用 Node.js API
    }
  })

  // 保存窗口实例引用
  mainWindowInstance = mainWindow

  // 窗口关闭时重置实例引用
  mainWindow.on('closed', () => {
    mainWindowInstance = null
  })

  // 窗口准备就绪时显示并初始化更新系统
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // 初始化自动更新系统
    setupAutoUpdater(mainWindow)

    // 启动时自动检查更新（仅在打包环境）
    if (app.isPackaged) {
      console.log('应用启动，自动检查更新...')
      checkForUpdates()
    }
  })

  // 设置外部链接打开方式
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 加载页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // 开发环境加载远程 URL
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // 生产环境加载本地 HTML 文件
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * 应用初始化
 * @description 应用程序准备就绪时执行的初始化操作
 */
app.whenReady().then(() => {
  // 设置应用用户模型 ID（Windows 平台）
  electronApp.setAppUserModelId('com.electron')

  // 监听窗口创建事件，优化窗口快捷键
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // macOS 平台设置 Dock 图标
  if (process.platform === 'darwin') {
    app.dock?.setIcon(icon)
  }

  // IPC 测试
  ipcMain.on('ping', () => console.log('pong'))

  // 创建主窗口
  createWindow()

  // macOS 平台激活事件处理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

/**
 * 所有窗口关闭时退出应用
 * @description Windows 和 Linux 平台关闭所有窗口时退出应用
 *              macOS 平台保持应用活跃，直到用户手动退出
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
