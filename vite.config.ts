import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project sites are served from a subpath.
// Override with SITE_BASE when deploying elsewhere (e.g. SITE_BASE=/ for a user site).
const base = process.env.SITE_BASE ?? '/CrashFactory/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
