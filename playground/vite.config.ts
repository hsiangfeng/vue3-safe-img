import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages 上的 base path 由環境變數注入；本地 dev 走根路徑
const base = process.env.VITE_PLAYGROUND_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [vue()],
  resolve: {
    alias: {
      'vue3-safe-img': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['vue3-safe-img'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
