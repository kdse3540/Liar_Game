import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'

// site.json 존재 여부 체크 후 안전하게 설정 불러오기
let siteConfiguration = { title: '라이어 게임', description: 'Say it. Hide it. Find the Liar.' }
const siteJsonPath = path.resolve(__dirname, './.figma/make/site.json')
if (fs.existsSync(siteJsonPath)) {
  try {
    siteConfiguration = JSON.parse(fs.readFileSync(siteJsonPath, 'utf-8'))
  } catch (e) {
    console.warn('site.json 파싱 실패, 기본 설정을 사용합니다.')
  }
}

// Vite 개발 및 빌드 설정
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
