# Use a full Debian Linux environment with Node.js
FROM node:18-bullseye

# Install Python 3, Curl, and FFmpeg (all required by yt-dlp)
RUN apt-get update && apt-get install -y python3 curl ffmpeg && rm -rf /var/lib/apt/lists/*

# Set up the app
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

# Start the server
CMD ["node", "index.js"]
