import type { App } from 'vue'

// Placeholder component export for scaffold; replace with real components later
export const VirtualScrollPlaceholder = {
  name: 'VirtualScrollPlaceholder',
  render() {
    return null
  }
}

export default {
  install(app: App) {
    app.component('VirtualScrollPlaceholder', VirtualScrollPlaceholder)
  }
}

export * from '@/types'
