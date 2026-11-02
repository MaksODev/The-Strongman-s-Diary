import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './state/store'

// iOS PWA (black-translucent): innerHeight короче экрана на высоту статус-бара,
// из-за чего снизу остаётся пустая полоса. Достраиваем высоту до полного экрана.
function syncAppHeight() {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches
  if (!standalone) {
    document.documentElement.style.removeProperty('--app-h')
    return
  }
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)'
  document.body.appendChild(probe)
  const top = parseFloat(getComputedStyle(probe).paddingTop) || 0
  probe.remove()
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight + top}px`)
}
syncAppHeight()
window.addEventListener('resize', syncAppHeight)
window.addEventListener('orientationchange', syncAppHeight)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
