# Use a slim Linux environment with Node.js
FROM node:18-bullseye-slim

# Install Python3, PIP, and FFmpeg
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && rm -rf /var/lib/apt/lists/*

# Install the official yt-dlp globally using python PIP
RUN pip3 install yt-dlp

# Set up the Node app
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Run the server
CMD ["node", "index.js"]
