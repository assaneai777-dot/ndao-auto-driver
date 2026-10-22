import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter, serveApkDownload } from './server/api.ts';

dotenv.config();
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('Configure SESSION_SECRET in Railway Variables before starting the production server.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Explicit APK direct download endpoints
app.get('/download/apk', serveApkDownload);
app.get('/api/download/apk', serveApkDownload);
app.get('/ndao_auto.apk', serveApkDownload);
app.get('/NDAO_AUTO.apk', serveApkDownload);
app.get('/ndao-auto.apk', serveApkDownload);

// Liveness endpoint for Railway
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
// API routes used by the web client and the Android APK
app.use('/api', apiRouter);

// Serve static built frontend
const distDir = path.resolve(process.cwd(), 'dist');
app.use(express.static(distDir));

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[NDAO'AUTO] Server running on http://0.0.0.0:${PORT}`);
});
