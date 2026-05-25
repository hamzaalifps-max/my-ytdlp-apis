const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('API is running. Use /info?url=YOUR_YOUTUBE_URL');
});

app.get('/info', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'Please provide a url parameter.' });
  }

  try {
    // Execute yt-dlp to dump JSON format
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      ]
    });
    
    res.json(output);
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ 
      error: 'Failed to extract video information.',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`yt-dlp microservice listening at http://localhost:${port}`);
});
