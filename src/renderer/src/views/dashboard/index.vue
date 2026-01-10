<template>
  <div class="dashboard">
    这是首页
    <button @click="onLogin">去登录</button>
    <Versions />
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import Versions from '@renderer/components/Versions.vue'
const router = useRouter()

const onLogin = (): void => {
  router.push('/login')
}
</script>

<style lang="scss" scoped></style>
