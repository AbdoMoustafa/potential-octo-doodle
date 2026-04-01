const express = require("express");
const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const execFileAsync = promisify(execFile);

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const PORT = process.env.PORT || 8080;
const TMP_DIR = path.join(os.tmpdir(), "video-proxy");

// Auth middleware
function auth(req, res, next) {
  if (!API_KEY) return next(); // No key configured = open (dev mode)
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Ensure tmp dir exists
fs.mkdir(TMP_DIR, { recursive: true }).catch(() => {});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Download a video by Instagram reel URL
app.post("/download", auth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  // Only allow Instagram URLs
  if (!url.includes("instagram.com")) {
    return res.status(400).json({ error: "Only Instagram URLs are supported" });
  }

  const fileId = crypto.randomBytes(8).toString("hex");
  const outputTemplate = path.join(TMP_DIR, `${fileId}.%(ext)s`);

  try {
    // Download video via yt-dlp with retries (Instagram API is inconsistent)
    let stdout;
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await execFileAsync("yt-dlp", [
          "--no-playlist",
          "-f", "mp4/best",
          "-o", outputTemplate,
          "--print", "filename",
          "--no-simulate",
          "--no-warnings",
          url,
        ], { timeout: 120_000 });
        stdout = result.stdout;
        break;
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err;
        // Wait before retry (5s, 10s)
        await new Promise((r) => setTimeout(r, attempt * 5000));
      }
    }

    const filePath = stdout.trim();

    // Verify file exists
    await fs.access(filePath);

    // Stream file back and delete after
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${fileId}.mp4"`);

    const { createReadStream } = require("fs");
    const stream = createReadStream(filePath);
    stream.pipe(res);
    stream.on("end", () => fs.unlink(filePath).catch(() => {}));
    stream.on("error", () => fs.unlink(filePath).catch(() => {}));
  } catch (err) {
    // Clean up any partial files
    const files = await fs.readdir(TMP_DIR).catch(() => []);
    for (const f of files) {
      if (f.startsWith(fileId)) {
        await fs.unlink(path.join(TMP_DIR, f)).catch(() => {});
      }
    }

    const message = err.stderr || err.message || "Download failed";
    console.error(`Download failed for ${url}:`, message);
    res.status(500).json({ error: "Download failed", detail: message });
  }
});

app.listen(PORT, () => {
  console.log(`Video proxy running on port ${PORT}`);
});
