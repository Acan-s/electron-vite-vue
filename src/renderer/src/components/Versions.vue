<script setup lang="ts">
import { reactive } from 'vue'

const versions = reactive({ ...window.electron.process.versions })
</script>

<template>
  <ul class="versions">
    <li class="electron-version">Electron： v{{ versions.electron }}</li>
    <li class="chrome-version">Chromium： v{{ versions.chrome }}</li>
    <li class="node-version">Node： v{{ versions.node }}</li>
  </ul>
</template>

<style>
.versions {
  width: 100%;
  justify-content: space-evenly;
  display: flex;
  position: absolute;
  left: 0;
  bottom: 10vh;

  li {
    background-color: bisque;
    padding: 5px 10px;
    border-radius: 5px;
  }
}
</style>
