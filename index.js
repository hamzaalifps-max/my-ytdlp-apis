/**
 * yt-dlp API Microservice – (Using Global PIP yt-dlp + Anti-Bot Bypass)
 */

'use strict';

const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
      '--extractor-args', 'youtube:player_client=android',
      url
    ];

    // Execute the global yt-dlp installed via python PIP
    execFile('yt-dlp', args, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
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

// --- Routes ---
const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', version: 'Standalone-2026-AntiBot' });
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

router.get('/diagnose', (req, res) => {
  try {
    const { execSync } = require('child_process');
    const version = execSync('yt-dlp --version').toString().trim();
    res.json({ status: 'success', binary_exists: true, version: version });
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
