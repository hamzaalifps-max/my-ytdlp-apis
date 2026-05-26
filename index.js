/**
 * yt-dlp API Microservice – Standalone Edition (Fixed for Railway)
 */

'use strict';

const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
  res.json({ status: 'ok', version: 'Standalone-2026-Fixed' });
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

// Diagnostics endpoint
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
