import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import Layout from '@renderer/layout/index.vue'

// routes路由数组的类型：RouteRecordRaw
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@renderer/views/dashboard/index.vue')
      }
    ]
  },
  {
    path: '/login',
    name: '/Login',
    component: () => import('@renderer/views/login/index.vue')
  }
]

const router = createRouter({
  routes,
  history: createWebHistory() // history模式
  // history: createWebHashHistory()// hash模式
})

// 导出 router
export default router
