// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Define environment variables for build time
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  server: {
    port: 3000,
    host: true, // Allow external connections for local development
  },
  build: {
    // Optimize for production
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          rtvi: ['@pipecat-ai/client-js', '@pipecat-ai/client-react', '@pipecat-ai/daily-transport'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge']
        }
      }
    }
  }
})

// ---

