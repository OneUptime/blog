# How to Set Up Docker for Automated Screenshot Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Screenshots, Puppeteer, Headless Chrome, Automation, Node.js, Testing

Description: Automate website screenshot generation using Docker with headless Chrome for visual testing, reporting, and monitoring.

---

Automated screenshots serve many purposes: visual regression testing, generating previews for link sharing, monitoring website appearance across deployments, and creating reports. Running a screenshot service in Docker gives you a consistent rendering environment that produces identical results regardless of where it runs. This guide walks through building a complete automated screenshot pipeline.

## Use Cases for Automated Screenshots

Before diving into the technical setup, consider the common scenarios where automated screenshots add value:

- **Visual regression testing** compares screenshots before and after code changes to catch unintended UI modifications.
- **Social media previews** generate Open Graph images for blog posts and landing pages.
- **Uptime monitoring dashboards** capture periodic screenshots of critical pages to verify they render correctly.
- **PDF report generation** uses screenshots as components in automated reports.
- **Competitive analysis** tracks visual changes on competitor websites over time.

## Building the Screenshot Service

The core of our screenshot service uses Puppeteer (headless Chrome) wrapped in an Express.js API. This lets other services request screenshots via HTTP.

Here is the Dockerfile:

```dockerfile
# Dockerfile - Screenshot service with headless Chrome
FROM node:20-slim

# Install Chromium and required system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    libxkbcommon0 \
    libxshmfence1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Point Puppeteer to the system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY src/ ./src/

# Create directory for storing generated screenshots
RUN mkdir -p /app/screenshots

EXPOSE 3000

CMD ["node", "src/server.js"]
```

Notice the font packages. Without `fonts-noto-cjk` and `fonts-noto-color-emoji`, pages with Chinese/Japanese/Korean text or emojis render as blank boxes.

## The Screenshot API Server

Here is the Express server that accepts screenshot requests:

```javascript
// src/server.js - HTTP API for generating screenshots on demand
const express = require('express');
const path = require('path');
const { captureScreenshot } = require('./capture');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/app/screenshots';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Screenshot endpoint accepts URL and optional configuration
app.post('/screenshot', async (req, res) => {
  const {
    url,
    width = 1366,
    height = 768,
    fullPage = false,
    format = 'png',
    quality = 80,
    delay = 0
  } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const buffer = await captureScreenshot({
      url, width, height, fullPage, format, quality, delay
    });

    // Set appropriate content type based on requested format
    const contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    console.error(`Screenshot failed for ${url}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Batch endpoint for multiple screenshots
app.post('/batch', async (req, res) => {
  const { urls, width = 1366, height = 768 } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'urls array is required' });
  }

  const results = [];
  for (const url of urls) {
    try {
      const buffer = await captureScreenshot({ url, width, height, format: 'png' });
      const filename = `${Date.now()}-${encodeURIComponent(url)}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      require('fs').writeFileSync(filepath, buffer);
      results.push({ url, filename, status: 'success' });
    } catch (err) {
      results.push({ url, error: err.message, status: 'failed' });
    }
  }

  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`Screenshot service running on port ${PORT}`);
});
```

The capture module handles the Puppeteer interaction:

```javascript
// src/capture.js - Core screenshot capture logic using Puppeteer
const puppeteer = require('puppeteer-core');

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

let browserInstance = null;

async function getBrowser() {
  // Reuse the browser instance across requests for performance
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  browserInstance = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars'
    ]
  });

  return browserInstance;
}

async function captureScreenshot({ url, width, height, fullPage, format, quality, delay }) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport dimensions to control the screenshot size
    await page.setViewport({ width, height, deviceScaleFactor: 2 });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Optional delay for animations or lazy-loaded content to finish
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }

    // Capture the screenshot with the requested settings
    const screenshotOptions = {
      type: format === 'jpeg' ? 'jpeg' : 'png',
      fullPage: fullPage,
    };

    if (format === 'jpeg') {
      screenshotOptions.quality = quality;
    }

    return await page.screenshot(screenshotOptions);
  } finally {
    await page.close();
  }
}

module.exports = { captureScreenshot };
```

## Docker Compose Configuration

```yaml
# docker-compose.yml - Screenshot service with shared volume for output
version: "3.8"

services:
  screenshot-service:
    build: .
    container_name: screenshot-service
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      OUTPUT_DIR: /app/screenshots
    volumes:
      # Persist screenshots on the host filesystem
      - ./screenshots:/app/screenshots
    shm_size: "1g"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Taking Screenshots via the API

Start the service and make requests:

```bash
# Launch the screenshot service
docker compose up -d --build
```

Take a single screenshot:

```bash
# Request a full-page PNG screenshot of example.com
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "fullPage": true, "width": 1440, "height": 900}' \
  --output screenshot.png
```

Take a JPEG screenshot with custom quality:

```bash
# Request a compressed JPEG screenshot
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "format": "jpeg", "quality": 60}' \
  --output screenshot.jpg
```

Batch screenshots:

```bash
# Request multiple screenshots in one call
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com", "https://example.org"], "width": 1366, "height": 768}'
```

## Scheduled Screenshot Monitoring

Capture periodic screenshots of important pages for monitoring:

```bash
#!/bin/bash
# scripts/monitor.sh - Take screenshots of critical pages every hour

PAGES=(
  "https://myapp.com"
  "https://myapp.com/login"
  "https://myapp.com/dashboard"
)

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

for page in "${PAGES[@]}"; do
  # Create a safe filename from the URL
  SAFE_NAME=$(echo "$page" | sed 's|https://||; s|/|_|g')
  OUTPUT="screenshots/${SAFE_NAME}_${TIMESTAMP}.png"

  curl -s -X POST http://localhost:3000/screenshot \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$page\", \"fullPage\": true}" \
    --output "$OUTPUT"

  echo "Captured: $OUTPUT"
done
```

Add this to a cron job:

```bash
# Run the monitoring script every hour
0 * * * * /path/to/scripts/monitor.sh >> /var/log/screenshot-monitor.log 2>&1
```

## Visual Regression Testing

Compare screenshots before and after deployments to detect visual changes:

```javascript
// src/compare.js - Compare two screenshots using pixel-level diffing
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const fs = require('fs');

function compareScreenshots(imagePath1, imagePath2, diffOutputPath) {
  const img1 = PNG.sync.read(fs.readFileSync(imagePath1));
  const img2 = PNG.sync.read(fs.readFileSync(imagePath2));

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  // Count the number of different pixels between the two images
  const numDiffPixels = pixelmatch(
    img1.data, img2.data, diff.data,
    width, height,
    { threshold: 0.1 }
  );

  // Write the diff image highlighting changed areas in red
  fs.writeFileSync(diffOutputPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const diffPercentage = (numDiffPixels / totalPixels * 100).toFixed(2);

  return { numDiffPixels, totalPixels, diffPercentage };
}

module.exports = { compareScreenshots };
```

## Handling Different Viewports

Generate screenshots for multiple device sizes to test responsive design:

```bash
# Capture screenshots at common device widths for responsive testing
for width in 375 768 1024 1440 1920; do
  curl -s -X POST http://localhost:3000/screenshot \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"https://myapp.com\", \"width\": $width, \"height\": 900, \"fullPage\": true}" \
    --output "screenshot-${width}px.png"
  echo "Captured ${width}px viewport"
done
```

## Wrapping Up

Docker-based screenshot generation provides a consistent rendering environment that eliminates cross-platform differences. The HTTP API approach makes the service accessible to any part of your infrastructure, from CI pipelines to monitoring tools. With proper font packages installed and adequate shared memory configured, the service produces high-quality screenshots reliably. Whether you use it for visual testing, monitoring, or content generation, the setup stays the same.
