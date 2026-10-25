import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages: 저장소 이름이 바뀌면 base도 맞춰서 바꿔 (예: '/jcg-web/')
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
})
