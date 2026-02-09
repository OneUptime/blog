# How to Run Puppeteer in Docker for Web Scraping

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Puppeteer, Web Scraping, Node.js, Headless Chrome, Automation

Description: Run Puppeteer inside Docker containers to scrape JavaScript-rendered websites with headless Chrome in a reproducible environment.

---

Puppeteer is the go-to tool for scraping modern web applications that rely heavily on JavaScript. It controls a headless Chrome browser programmatically, rendering pages exactly as a real user would see them. Running Puppeteer in Docker eliminates the "works on my machine" problem and makes deployments consistent across development and production.

## The Challenge with Puppeteer and Docker

Puppeteer needs Chromium to run, and Chromium requires a specific set of system libraries. Missing even one library causes cryptic startup failures. Docker solves this by bundling everything into a deterministic image, but getting the Dockerfile right takes some care.

## Building the Puppeteer Docker Image

Here is a Dockerfile that installs all required dependencies for Chromium:

```dockerfile
# Dockerfile - Node.js environment with all Chromium dependencies for Puppeteer
FROM node:20-slim

# Install libraries that Chromium requires to run headlessly
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system-installed Chromium instead of downloading its own
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create a non-root user for security
RUN groupadd -r scraper && useradd -r -g scraper -G audio,video scraper \
    && mkdir -p /home/scraper/app \
    && chown -R scraper:scraper /home/scraper

WORKDIR /home/scraper/app

# Install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy application source
COPY src/ ./src/

USER scraper

CMD ["node", "src/scraper.js"]
```

The key decision here is using the system-installed Chromium rather than letting Puppeteer download its own. This reduces image size and avoids download issues during builds.

## Package Configuration

Set up your Node.js project:

```json
{
  "name": "docker-puppeteer-scraper",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "puppeteer-core": "^22.0.0"
  }
}
```

Note the use of `puppeteer-core` instead of `puppeteer`. The core package does not download Chromium, which is what we want since we installed it at the system level.

## Writing the Scraper

Here is a practical scraper that extracts product data from an e-commerce page:

```javascript
// src/scraper.js - Puppeteer scraper for JavaScript-rendered pages
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

// Configuration from environment variables
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';

async function launchBrowser() {
  // Launch Chromium with flags suitable for running inside Docker
  return puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--single-process'
    ]
  });
}

async function scrapeQuotes(browser) {
  const page = await browser.newPage();

  // Set a realistic viewport and user agent
  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  );

  const allQuotes = [];
  let pageNum = 1;

  while (true) {
    const url = `http://quotes.toscrape.com/js/page/${pageNum}/`;
    console.log(`Scraping page ${pageNum}: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for quotes to render via JavaScript
    await page.waitForSelector('.quote', { timeout: 10000 }).catch(() => null);

    // Extract quote data from the rendered DOM
    const quotes = await page.evaluate(() => {
      const quoteElements = document.querySelectorAll('.quote');
      return Array.from(quoteElements).map(el => ({
        text: el.querySelector('.text')?.textContent?.trim(),
        author: el.querySelector('.author')?.textContent?.trim(),
        tags: Array.from(el.querySelectorAll('.tag')).map(t => t.textContent.trim())
      }));
    });

    if (quotes.length === 0) break;

    allQuotes.push(...quotes);
    console.log(`  Found ${quotes.length} quotes`);
    pageNum++;

    // Polite delay between pages
    await new Promise(r => setTimeout(r, 1500));
  }

  await page.close();
  return allQuotes;
}

async function takeScreenshot(browser, url, filename) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Capture a full-page screenshot as PNG
  const screenshotPath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);

  await page.close();
}

async function main() {
  // Ensure the output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await launchBrowser();

  try {
    // Scrape all quotes across paginated pages
    const quotes = await scrapeQuotes(browser);

    // Save the scraped data as JSON
    const outputPath = path.join(OUTPUT_DIR, 'quotes.json');
    fs.writeFileSync(outputPath, JSON.stringify(quotes, null, 2));
    console.log(`Saved ${quotes.length} quotes to ${outputPath}`);

    // Take a screenshot of the first page as proof of execution
    await takeScreenshot(browser, 'http://quotes.toscrape.com', 'homepage.png');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
```

## Docker Compose Configuration

For more complex setups, use Docker Compose to manage the scraper and its output:

```yaml
# docker-compose.yml - Puppeteer scraper with volume-mounted output
version: "3.8"

services:
  scraper:
    build: .
    container_name: puppeteer-scraper
    environment:
      OUTPUT_DIR: /app/output
      NODE_ENV: production
    volumes:
      # Persist scraped data to the host filesystem
      - ./output:/app/output
    # Increase shared memory to prevent Chromium crashes
    shm_size: "1g"
    # Security options required for Chromium inside Docker
    security_opt:
      - seccomp=unconfined
```

Build and run:

```bash
# Build the image and run the scraper
docker compose up --build
```

## Handling Common Puppeteer-in-Docker Issues

**Chromium crashes with "out of memory":** The default shared memory size in Docker is 64MB, which is not enough for Chromium. Set `shm_size: "1g"` in Docker Compose or use the `--disable-dev-shm-usage` Chrome flag, which makes Chromium write shared memory to `/tmp` instead.

**Navigation timeout errors:** Increase the timeout and use a more lenient wait condition:

```javascript
// Use domcontentloaded instead of networkidle2 for faster, more reliable loads
await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 60000
});
```

**Detected as a bot:** Some sites detect headless browsers. Add evasion measures:

```javascript
// src/stealth.js - Basic anti-detection measures for Puppeteer
async function applyStealthMeasures(page) {
  // Override the webdriver property that reveals automation
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // Set realistic screen dimensions in the navigator object
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });
}
```

For more comprehensive stealth, consider the `puppeteer-extra-plugin-stealth` package.

## Running Multiple Scrapers in Parallel

When you need to scrape thousands of pages, run multiple container instances:

```bash
# Run 5 scraper instances in parallel with different URL ranges
for i in $(seq 1 5); do
  docker run -d \
    --name scraper-$i \
    --shm-size=1g \
    -e BATCH_ID=$i \
    -e TOTAL_BATCHES=5 \
    -v $(pwd)/output:/app/output \
    puppeteer-scraper
done
```

Partition URLs inside your scraper based on `BATCH_ID` and `TOTAL_BATCHES` to avoid duplicate work.

## Optimizing Image Size

The full Puppeteer Docker image can be large. Here are ways to trim it:

```dockerfile
# Multi-stage build to reduce final image size
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

FROM node:20-slim
# Install only the minimal Chromium dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/

RUN groupadd -r scraper && useradd -r -g scraper scraper \
    && chown -R scraper:scraper /app
USER scraper

CMD ["node", "src/scraper.js"]
```

This multi-stage build keeps the final image clean by excluding build tools and npm cache.

## Wrapping Up

Puppeteer in Docker gives you a locked-down, reproducible scraping environment that handles JavaScript-rendered pages reliably. The combination of system-installed Chromium, proper security flags, and adequate shared memory configuration covers the most common pain points. Whether you are scraping a handful of pages or millions, this Docker-based setup scales from a single container to a fleet of parallel scrapers.
