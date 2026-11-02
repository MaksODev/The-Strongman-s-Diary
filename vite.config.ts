import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(5, 16)) },
  base: '/The-Strongman-s-Diary/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Дневник силача',
        short_name: 'Силач',
        description: 'Силовые тренировки: программа с периодизацией, каталог упражнений, прогресс и рекорды.',
        lang: 'ru',
        start_url: '/The-Strongman-s-Diary/',
        scope: '/The-Strongman-s-Diary/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0e',
        theme_color: '#0a0a0e',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // Каталог иллюстраций (53 МБ) кэшируется по запросу — офлайн после первого просмотра.
        runtimeCaching: [
          {
            urlPattern: /\/illustrations\/.*\.jpg$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: { maxEntries: 900, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
