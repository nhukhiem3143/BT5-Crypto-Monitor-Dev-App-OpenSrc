import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://flask-api:5000'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})