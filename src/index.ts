import type { App } from 'vue'
import VirtualList from './components/VirtualList.vue'

export { default as VirtualList } from './components/VirtualList.vue'

export default {
  install(app: App) {
    app.component('VirtualList', VirtualList)
  }
}

export * from './types'
