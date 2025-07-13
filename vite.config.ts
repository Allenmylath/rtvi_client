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
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  server: {
    port: 3000,
    host: true, // Allow external connections for local development
  },
  build: {
    // Optimize for production
    sourcemap: false,
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          rtvi: ['@pipecat-ai/client-js', '@pipecat-ai/client-react', '@pipecat-ai/daily-transport'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge']
        }
      }
    },
    // Ensure CSS is properly built
    cssCodeSplit: true,
    assetsDir: 'assets',
  },
  css: {
    // Ensure CSS is processed correctly
    postcss: './postcss.config.js',
    devSourcemap: true,
  },
})
