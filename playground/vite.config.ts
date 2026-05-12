import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
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
