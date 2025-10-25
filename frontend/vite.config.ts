import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind to IPv4 loopback to avoid IPv6-only binding ("::") which can
    // make the dev server inaccessible from some Windows setups.
    host: '127.0.0.1',
    port: 8080,
    proxy: {
      '/api': {
        // Backend runs on port 5000 in development by default in this repo
        // Use 127.0.0.1 to avoid localhost resolving to IPv6 (::1) which can
        // cause proxy connection issues on some Windows setups.
        target: process.env.BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/webhook': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
