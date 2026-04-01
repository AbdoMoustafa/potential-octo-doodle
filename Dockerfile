FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 pip ffmpeg && \
    pip install --break-system-packages yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
