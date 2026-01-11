<template>
  <div class="dashboard">
    这是首页
    <div class="test">测试应用更新是否生效-测试应用更新是否生效</div>
    <button @click="onLogin">去登录</button>
    <Update />
    <Versions />
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import Versions from '@renderer/components/Versions.vue'
import Update from '@renderer/components/Update.vue'
const router = useRouter()

const onLogin = (): void => {
  router.push('/login')
}
</script>

<style scoped>
.test {
  background-color: pink;
}
</style>
