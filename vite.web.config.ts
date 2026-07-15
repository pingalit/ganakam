import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone web build — no Electron dependencies.
// Deployed to ganakam.pedra.space via Cloudflare Pages.
export default defineConfig({
  plugins: [react()],
  base: '/',
  root: 'src/renderer',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  build: {
    outDir: resolve('out/web'),
    emptyOutDir: true
  }
})
