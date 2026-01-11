<template>
  <div class="update-container">
    <button :disabled="isChecking" class="update-btn" @click="handleCheckUpdate">
      {{ isChecking ? '检查中...' : '检查更新' }}
    </button>

    <!-- 更新提示 -->
    <div v-if="updateTip" class="update-tip">{{ updateTip }}</div>

    <!-- 下载进度 -->
    <div v-if="progress > 0" class="progress-bar">
      <div class="progress-inner" :style="{ width: `${progress}%` }"></div>
      <span class="progress-text">{{ progress.toFixed(1) }}%</span>
    </div>

    <!-- 操作按钮 -->
    <div v-if="hasUpdate" class="update-actions">
      <button class="download-btn" @click="handleDownloadUpdate">立即下载</button>
      <button v-if="progress > 0" class="cancel-btn" @click="handleCancelUpdate">取消下载</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

// 状态管理
const isChecking = ref(false)
const progress = ref(0)
const updateTip = ref('')
const hasUpdate = ref(false)
const currentVersion = ref('')

// 监听更新事件
window.electronUpdate.onUpdateAvailable((info) => {
  hasUpdate.value = true
  currentVersion.value = info.version
  updateTip.value = `发现新版本：${info.version}\n${info.releaseNotes}`
})

window.electronUpdate.onUpdateNotAvailable(() => {
  updateTip.value = '当前已是最新版本'
  hasUpdate.value = false
})

window.electronUpdate.onUpdateProgress((p) => {
  progress.value = p.percent
  updateTip.value = `正在下载：${p.percent.toFixed(1)}%`
})

window.electronUpdate.onUpdateDownloaded(() => {
  updateTip.value = '更新包下载完成，点击下方按钮重启安装'
  progress.value = 0
  hasUpdate.value = false
  // 也可以直接弹窗提示
  if (confirm('更新包已下载完成，是否立即重启应用？')) {
    window.electronUpdate.installUpdate()
  }
})

window.electronUpdate.onUpdateError((errorMsg) => {
  updateTip.value = `更新失败：${errorMsg}`
  isChecking.value = false
  progress.value = 0
})

// 检查更新
const handleCheckUpdate = async (): Promise<void> => {
  isChecking.value = true
  updateTip.value = ''
  progress.value = 0

  const res = await window.electronUpdate.checkUpdate()
  isChecking.value = false

  if (res.success) {
    if (res.hasUpdate) {
      hasUpdate.value = true
      currentVersion.value = res.version!
      updateTip.value = `发现新版本：${res.version}\n${res.releaseNotes}`
    } else {
      updateTip.value = '当前已是最新版本'
    }
  } else {
    updateTip.value = res.message || '检查更新失败'
  }
}

// 下载更新
const handleDownloadUpdate = async (): Promise<void> => {
  const res = await window.electronUpdate.downloadUpdate()
  if (res.success) {
    updateTip.value = res.message!
  } else {
    updateTip.value = '开始下载失败'
  }
}

// 取消下载
const handleCancelUpdate = async (): Promise<void> => {
  await window.electronUpdate.cancelUpdate()
  progress.value = 0
  updateTip.value = '已取消更新下载'
}

// 组件卸载时移除监听（避免内存泄漏）
onUnmounted(() => {
  window.electronUpdate.removeAllListeners()
})
</script>

<style scoped>
.update-container {
  padding: 20px;
  text-align: center;
}

.update-btn {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.update-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.update-tip {
  margin: 10px 0;
  color: #666;
  white-space: pre-line;
}

.progress-bar {
  width: 300px;
  height: 20px;
  border: 1px solid #eee;
  border-radius: 10px;
  margin: 10px auto;
  overflow: hidden;
  position: relative;
}

.progress-inner {
  height: 100%;
  background: #409eff;
  transition: width 0.3s;
}

.progress-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  line-height: 20px;
  font-size: 12px;
  color: #333;
}

.update-actions {
  margin-top: 10px;
}

.download-btn {
  background: #67c23a;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

.cancel-btn {
  background: #f56c6c;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
