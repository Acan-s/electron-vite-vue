<template>
  <div class="login">
    这是登录页面
    <div class="action">
      <a target="_blank" rel="noreferrer" @click="ipcHandle">Send IPC</a>
    </div>

    <button @click="onLogin">登录</button>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

const onLogin = (): void => {
  router.push('/dashboard')
}
</script>

<style lang="scss" scoped></style>
