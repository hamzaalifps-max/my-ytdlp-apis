/**
 * yt-dlp API Microservice – Standalone Edition (Bypasses System Python)
 */

'use strict';

const express = require('express');
const cors = require('cors');
const { execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Path to the standalone binary
const BIN_PATH = path.join(__dirname, 'yt-dlp_linux');

// --- 1. Auto-Download the Standalone Binary on Startup ---
function ensureBinaryExists() {
  if (fs.existsSync(BIN_PATH)) {
    console.log('[yt-dlp] Standalone binary found at:', BIN_PATH);
    return;
  }
  
  console.log('[yt-dlp] Downloading standalone yt-dlp_linux binary (this takes a moment)...');
  try {
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
    execSync(`curl -L -o "${BIN_PATH}" "${url}"`, { stdio: 'inherit' });
    execSync(`chmod +x "${BIN_PATH}"`, { stdio: 'inherit' });
    console.log('[yt-dlp] Download complete and marked as executable.');
  } catch (err) {
    console.error('[yt-dlp] Failed to download binary:', err.message);
  }
}

ensureBinaryExists();

// --- 2. Helper to run yt-dlp ---
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function extractVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '-J', // dump JSON
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--skip-download',
      '--add-header', `user-agent:${USER_AGENT}`,
      url
    ];

    execFile(BIN_PATH, args, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (error) {
        return reject({ error, stderr, stdout });
      }
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (parseError) {
        reject({ error: parseError, stderr, stdout });
      }
    });
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

// --- 3. Routes ---
const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', version: 'Standalone-2026' });
});

router.get('/info', async (req, res) => {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'Missing required parameter: url' });
  if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

  try {
    const data = await extractVideoInfo(url);
    return res.json(data);
  } catch (err) {
    console.error('[yt-dlp error]', err.stderr || err.error?.message);
    const details = (err.stderr || err.error?.message || '').split('\n').find(l => l.toLowerCase().includes('error')) || 'Unknown execution error';
    return res.status(500).json({
      error: 'yt-dlp failed to extract video information.',
      details: details.trim()
    });
  }
});

// Diagnostics endpoint to test the standalone binary
router.get('/diagnose', (req, res) => {
  try {
    const version = execSync(`"${BIN_PATH}" --version`).toString().trim();
    res.json({ status: 'success', binary_exists: fs.existsSync(BIN_PATH), version: version });
  } catch (err) {
    res.json({ status: 'failed', binary_exists: fs.existsSync(BIN_PATH), error: err.message });
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
