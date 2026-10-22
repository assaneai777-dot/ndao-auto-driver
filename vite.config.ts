import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { apiApp } from './server/api.ts';

dotenv.config();

function apiServerPlugin(): Plugin {
  return {
    name: 'ndao-api-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // Direct APK download interception with attachment header
        if (url.includes('download/apk') || url.endsWith('.apk') || url.includes('/apk')) {
          const candidatePaths = [
            path.resolve(process.cwd(), 'public', 'ndao_auto.apk'),
            path.resolve(process.cwd(), 'public', 'NDAO_AUTO.apk'),
            path.resolve(process.cwd(), 'dist', 'ndao_auto.apk'),
          ];
          for (const p of candidatePaths) {
            if (fs.existsSync(p)) {
              const stat = fs.statSync(p);
              res.setHeader('Content-Type', 'application/vnd.android.package-archive');
              res.setHeader('Content-Disposition', 'attachment; filename="NDAO_AUTO.apk"');
              res.setHeader('Content-Length', stat.size.toString());
              res.setHeader('Cache-Control', 'public, max-age=3600');
              fs.createReadStream(p).pipe(res as any);
              return;
            }
          }
        }

        // Direct Favicon fallback
        if (url.startsWith('/favicon.ico')) {
          const favPath = path.resolve(process.cwd(), 'public', 'favicon.ico');
          if (fs.existsSync(favPath)) {
            res.setHeader('Content-Type', 'image/x-icon');
            fs.createReadStream(favPath).pipe(res as any);
            return;
          }
        }

        // API endpoints
        if (url.startsWith('/api')) {
          apiApp(req as any, res as any, next);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      target: 'es2018',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
