import { createApp } from 'vue'
import App from './App.vue'
import VirtualScroll from '../src'

const app = createApp(App)
app.use(VirtualScroll)
app.mount('#app')
