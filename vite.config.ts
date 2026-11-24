import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — чтобы приложение работало на GitHub Pages из любой папки
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true, port: 5173 },
})
