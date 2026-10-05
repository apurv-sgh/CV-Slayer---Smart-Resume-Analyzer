import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.API_PROXY_TARGET || `http://localhost:${env.API_PORT || env.PORT || 4000}`

  if (mode === 'production' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL must be set to the deployed API origin for production builds.')
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': apiTarget,
        '/socket.io': { target: apiTarget, ws: true },
      },
    },
  }
})
