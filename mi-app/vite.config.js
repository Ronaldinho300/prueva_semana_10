import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'https://prueva-semana-10-1.onrender.com',
      '/api':  'https://prueva-semana-10-1.onrender.com',
    }
  }
})