# Railway Video Proxy

Lightweight service that downloads Instagram reel videos via yt-dlp on Railway's servers, keeping your IP unexposed.

## Deploy to Railway

1. Push this folder to a GitHub repo (or use Railway CLI)
2. Connect the repo to Railway (railway.app)
3. Set environment variable: `API_KEY=your-secret-key`
4. Railway auto-deploys from the Dockerfile

## Environment Variables

- `API_KEY` — Required in production. Requests must include `x-api-key` header.
- `PORT` — Defaults to 8080 (Railway sets this automatically)

## Endpoints

### `GET /health`
Health check. Returns `{ "status": "ok" }`.

### `POST /download`
Download a video from an Instagram reel URL.

**Headers:** `x-api-key: your-secret-key`

**Body:** `{ "url": "https://www.instagram.com/reel/ABC123/" }`

**Response:** Video file stream (video/mp4)

## Local Testing

```bash
npm install
node server.js
# In another terminal:
curl -X POST http://localhost:8080/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.instagram.com/reel/SHORTCODE/"}'
```

Requires yt-dlp and ffmpeg installed locally.
