# electron-vite-vue

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## 打包部署

### 打包 Windows 并发布到 GitHub Releases
npm run build:win -- --publish always
### 打包 macOS 并发布到 GitHub Releases
npm run build:mac -- --publish always
### 打包全平台并发布（仅 macOS 系统可用）
npm run build:all -- --publish always