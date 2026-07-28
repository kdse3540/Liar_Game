import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './components/AstraUI'
import './index.css'

/**
 * ====================================================================
 * [웹 시작점 (Main Entry)]
 * React 실행을 위한 기본 엔트리 포인트 파일입니다.
 * ====================================================================
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
