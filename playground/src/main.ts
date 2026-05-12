import { createApp } from 'vue'
import VueSafeImg from 'vue3-safe-img'
import App from './App.vue'

const app = createApp(App)
app.use(VueSafeImg, {
  retry: 1,
  retryDelay: 300,
})
app.mount('#app')
