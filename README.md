# vue-virtual-scroll (scaffold)

一個 Vue 3 虛擬滾動組件的開源套件架構樣板。本倉庫目前僅包含開源套件的基本結構與開發/建置配置，尚未實作任何功能邏輯。

## 安裝與開發

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

## 使用方式（Playground）

執行 `npm run dev` 後，會以 examples 為開發入口，掛載 `src` 輸出的插件：

```ts
import { createApp } from 'vue'
import App from './App.vue'
import VirtualScroll from '../src'

const app = createApp(App)
app.use(VirtualScroll)
app.mount('#app')
```

## 目前狀態

- 僅有套件目錄結構與建置腳本
- 匯出占位元件 `VirtualScrollPlaceholder`，之後可替換為真實元件

## 授權

MIT
