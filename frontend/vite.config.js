import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
<<<<<<< Updated upstream
    port: 8000,
=======
    port: 8080,
>>>>>>> Stashed changes
    proxy: {
      '/api': 'http://127.0.0.1:8001',
    },
  },
})
