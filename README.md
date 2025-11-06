## vue-virtual-scroll

Vue 3 虛擬滾動列表元件。支援垂直/水平、固定/動態高度（寬度）、
可選用 Web Worker 計算，並提供事件與滾動控制 API。

核心元件：`VirtualList`（已透過 `src/index.ts` 提供安裝與命名匯出）

---

### 功能特點
- 固定尺寸與動態尺寸虛擬化
- 垂直與水平滾動
- 可選 Web Worker 計算（降低主執行緒負擔）
- 完整事件（scroll / range-change / reach-start / reach-end / resize）
- 方法：`scrollToIndex`、`scrollToOffset`、`scrollToTop`、`getVisibleRange`

---

### 安裝與引入

本倉庫已包含範例專案（`examples/`）。開發/預覽：

```bash
npm install
npm run dev
```

建置套件：

```bash
npm run build
```

專案中使用（套件型態）：

```ts
import { createApp } from 'vue'
import App from './App.vue'
import VirtualScroll, { VirtualList } from 'virtual-scroll' 

const app = createApp(App)
app.use(VirtualScroll) // 全域註冊 <VirtualList/>
app.mount('#app')
```

---

### 基本用法（元件）

```vue
<template>
  <VirtualList
    :items="items"
    :item-size="48"
    height="400"
  >
    <template #default="{ item, index }">
      <div class="row">{{ index }} - {{ item.title }}</div>
    </template>
  </VirtualList>
  <button @click="scrollTo100">滾到第 100 筆</button>
  <button @click="toTop">回頂部</button>
  <div>可視範圍：{{ range.start }} ~ {{ range.end }}</div>
  <div>是否到頂/底：{{ atStart }} / {{ atEnd }}</div>
  <div>viewport：{{ viewport.width }} x {{ viewport.height }}</div>
  <div>scrollOffset：{{ scrollOffset }}</div>
  
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const items = ref(Array.from({ length: 100000 }, (_, i) => ({ id: i, title: `Item ${i}` })))
const listRef = ref<InstanceType<typeof import('virtual-scroll').VirtualList> | null>(null)

function scrollTo100() {
  listRef.value?.scrollToIndex(100)
}
function toTop() {
  listRef.value?.scrollToTop()
}

// 監聽事件可於模板上使用 @scroll / @range-change / @reach-start / @reach-end / @resize
</script>
```

可用屬性（Props）：

- `items: any[]`：資料來源
- `itemSize: number`：單筆固定尺寸（垂直時為高度、水平時為寬度）。動態尺寸時仍作為預估值使用
- `overscan?: number = 5`：預先渲染的額外範圍
- `height?: number | string`：容器高度
- `direction?: 'vertical' | 'horizontal' = 'vertical'`
- `dynamic?: boolean = false`：是否為動態尺寸
- `useWorker?: boolean = false`：是否啟用 Web Worker 計算
- 進階樣式/標籤：`tag`、`innerTag`、`itemTag`、`containerClass`、`containerStyle`、`innerClass`、`innerStyle`、`itemClass`、`itemStyle`
- `keyField?: string | ((item, index) => string | number)`：自訂 key 來源

事件（Events）：

- `scroll`：{ scrollTop, scrollLeft, scrollOffset }
- `range-change`：{ start, end }
- `reach-start`：boolean
- `reach-end`：boolean
- `resize`：{ width, height }

方法（透過 template ref 調用）：

- `scrollToIndex(index: number, align?: 'start' | 'center' | 'end')`
- `scrollToOffset(offset: number)`
- `scrollToTop()`
- `getVisibleRange(): { start: number; end: number }`

---

### 動態尺寸

將 `dynamic` 設為 `true` 後，元件會透過 `ResizeObserver` 自動量測每個項目的實際尺寸，並快取以提升效能。

注意：若項目內容尺寸會隨狀態改變，建議避免在未重新渲染時切換大量樣式，或確保內容變化可被 `ResizeObserver` 正確偵測。

---

### 水平清單

將 `direction` 設為 `horizontal`，`itemSize` 即代表寬度，容器會以水平方式虛擬化渲染。

```vue
<VirtualList :items="items" :item-size="160" direction="horizontal" height="160" />
```

---

### 進階：自訂渲染（useVirtualScroll）

若你需要完全掌控 DOM 結構或採用節點池重用等策略，可直接使用可組合函式 `useVirtualScroll`：

```ts
import { ref, computed } from 'vue'
import { useVirtualScroll } from '@/composables/useVirtualScroll'

const containerRef = ref<HTMLElement | null>(null)
const items = ref<any[]>([])

const {
  range, offset, totalSize,
  viewportSize, atStart, atEnd,
  handleScroll, scrollToIndex, scrollToOffset, scrollToTop,
  measure, unmeasure,
} = useVirtualScroll(containerRef, {
  itemCount: computed(() => items.value.length),
  itemSize: computed(() => 48),
  overscan: 5,
  direction: 'vertical',
  dynamic: false,
  useWorker: false,
})
```

這種方式可搭配「固定長度節點池」來重用 DOM 節點，僅更新綁定資料與位移，進一步降低 mount/unmount 成本。

---

### 進階：啟用 Web Worker 計算

將 `useWorker` 設為 `true` 可把範圍計算放到 Worker（`src/workers/useWorkersCalc.ts`）。

- 需使用支援 `new URL('...', import.meta.url)` 的建置工具（如 Vite）。
- SSR 環境請在客戶端再初始化或在代碼中進行環境檢查。

```vue
<VirtualList :items="items" :item-size="48" :use-worker="true" />
```

---

### 效能建議
- 適當調整 `overscan`，太小可能在極速滾動時閃爍，太大會增加渲染成本。
- 大量/複雜項目建議啟用 `useWorker`。
- 動態尺寸列表中，盡量避免項目在 mount 後頻繁改變尺寸；若需要，確保 `ResizeObserver` 能偵測到變動。
- 若需要極致效能，可使用 `useVirtualScroll` 自行實作節點池（DOM recycling）。

---

### 授權

MIT
