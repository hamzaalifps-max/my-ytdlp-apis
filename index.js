/**
 * yt-dlp API Microservice – Standalone Edition (No Curl or Python Required)
 */

'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// --- NATIVE NODE.JS DOWNLOADER (Bypasses the need for curl) ---
function downloadBinary() {
  return new Promise((resolve, reject) => {
    const binDir = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin');
    const binPath = path.join(binDir, 'yt-dlp');
    
    // Skip if we already downloaded it
    if (fs.existsSync(binPath)) {
      console.log('[yt-dlp] Binary already exists.');
      return resolve();
    }

    fs.mkdirSync(binDir, { recursive: true });
    console.log('[yt-dlp] Downloading yt-dlp_linux natively...');

    const requestUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

    function fetch(url) {
      https.get(url, (res) => {
        // Handle redirects (GitHub releases always redirect)
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetch(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('Failed to download: ' + res.statusCode));
        }
        
        const file = fs.createWriteStream(binPath);
        res.pipe(file);
        
        file.on('finish', () => {
          file.close();
          fs.chmodSync(binPath, 0o755); // Make it executable
          console.log('[yt-dlp] Download complete and marked executable.');
          resolve();
        });
      }).on('error', reject);
    }
    
    fetch(requestUrl);
  });
}

// Download before starting the server
downloadBinary().then(() => {
  const youtubedl = require('youtube-dl-exec');

  function extractVideoInfo(url) {
    return youtubedl(url, {
      dumpJson: true,
      noPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
      skipDownload: true,
      addHeader: [`user-agent:${USER_AGENT}`]
    });
  }

  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  // --- Routes ---
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'ok', version: 'Standalone-2026-ZeroDependencies' });
  });

  router.get('/info', async (req, res) => {
    const { url } = req.query;

    if (!url) return res.status(400).json({ error: 'Missing required parameter: url' });
    if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

    try {
      const data = await extractVideoInfo(url);
      return res.json(data);
    } catch (err) {
      console.error('[yt-dlp error]', err.stderr || err.message);
      const details = (err.stderr || err.message || '').split('\n').find(l => l.toLowerCase().includes('error')) || 'Unknown execution error';
      return res.status(500).json({
        error: 'yt-dlp failed to extract video information.',
        details: details.trim()
      });
    }
  });

  router.get('/diagnose', async (req, res) => {
    try {
      const output = await youtubedl.exec('', { version: true });
      res.json({ status: 'success', binary_exists: true, version: output.stdout.trim() });
    } catch (err) {
      res.json({ status: 'failed', binary_exists: false, error: err.message });
    }
  });

  app.use('/', router);
  app.use('/ytdlp-api', router);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found. Use GET /info?url=<video_url>' });
  });

  app.listen(PORT, () => {
    console.log(`[yt-dlp API] Listening on port ${PORT}`);
  });

}).catch(err => {
  console.error('CRITICAL ERROR: Failed to download yt-dlp binary during startup:', err);
  process.exit(1);
});
