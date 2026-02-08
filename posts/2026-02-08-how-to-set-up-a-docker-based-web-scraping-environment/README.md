# How to Set Up a Docker-Based Web Scraping Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Web Scraping, Python, Selenium, BeautifulSoup, Docker Compose, Automation

Description: Build a complete Docker-based web scraping environment with Python, Selenium, and proxy rotation for reliable data extraction.

---

Web scraping projects have a reputation for being fragile. Browser versions change, dependencies conflict, and what works on your laptop breaks on the server. Docker solves these problems by packaging your scraping tools, browsers, and dependencies into a reproducible environment. This guide builds a complete web scraping setup from scratch.

## Why Docker for Web Scraping?

Scraping projects depend on specific browser versions, language runtimes, system libraries, and often proxy configurations. A scraper that works today might break tomorrow when Chrome updates. Docker freezes these dependencies, giving you reproducible builds that run identically everywhere.

Beyond consistency, Docker also makes it easy to scale scrapers horizontally. Need to scrape 10,000 pages quickly? Spin up multiple container instances and distribute the workload.

## Project Structure

Here is the directory layout for our scraping environment:

```
scraper/
  Dockerfile
  docker-compose.yml
  requirements.txt
  src/
    scraper.py
    utils.py
  config/
    targets.json
  output/
```

## Building the Base Scraper Image

Start with a Dockerfile that includes Python, common scraping libraries, and a headless browser:

```dockerfile
# Dockerfile - Python scraping environment with Chrome and Selenium
FROM python:3.12-slim

# Install Chrome dependencies and the browser itself
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg2 \
    curl \
    unzip \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY src/ ./src/
COPY config/ ./config/

# Create output directory for scraped data
RUN mkdir -p /app/output

CMD ["python", "src/scraper.py"]
```

The requirements file includes the essential scraping libraries:

```txt
# requirements.txt - Core scraping dependencies
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.1.0
selenium==4.18.1
webdriver-manager==4.0.1
aiohttp==3.9.3
fake-useragent==1.4.0
```

## Docker Compose with Selenium Grid

For browser-based scraping at scale, Selenium Grid lets you run multiple browser instances. Here is a Docker Compose configuration:

```yaml
# docker-compose.yml - Scraping environment with Selenium Grid
version: "3.8"

services:
  # Selenium Hub distributes browser sessions across nodes
  selenium-hub:
    image: selenium/hub:4.18
    container_name: selenium-hub
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"
    networks:
      - scrapenet

  # Chrome nodes handle the actual browser rendering
  chrome-node:
    image: selenium/node-chrome:4.18
    depends_on:
      - selenium-hub
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_EVENT_BUS_PUBLISH_PORT: 4442
      SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
      # Each node supports up to 3 concurrent browser sessions
      SE_NODE_MAX_SESSIONS: 3
      SE_NODE_OVERRIDE_MAX_SESSIONS: "true"
    shm_size: "2g"
    # Scale this service for more parallel browsers
    deploy:
      replicas: 2
    networks:
      - scrapenet

  scraper:
    build: .
    depends_on:
      - selenium-hub
      - chrome-node
    environment:
      SELENIUM_HUB_URL: http://selenium-hub:4444/wd/hub
      OUTPUT_DIR: /app/output
    volumes:
      # Mount output directory so scraped data persists on the host
      - ./output:/app/output
      - ./config:/app/config
    networks:
      - scrapenet

networks:
  scrapenet:
    driver: bridge
```

## Writing the Scraper

Here is a practical scraper that uses both BeautifulSoup for simple pages and Selenium for JavaScript-heavy sites:

```python
# src/scraper.py - Dual-mode scraper with requests/BS4 and Selenium fallback
import os
import json
import time
import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from fake_useragent import UserAgent

# Initialize user agent rotator for avoiding detection
ua = UserAgent()

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "./output")
SELENIUM_HUB = os.environ.get("SELENIUM_HUB_URL", "http://localhost:4444/wd/hub")


def scrape_static(url):
    """Scrape a page that does not require JavaScript rendering."""
    headers = {"User-Agent": ua.random}
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    return {
        "url": url,
        "title": soup.title.string if soup.title else None,
        "text": soup.get_text(separator=" ", strip=True)[:5000],
        "links": [a.get("href") for a in soup.find_all("a", href=True)]
    }


def scrape_dynamic(url):
    """Scrape a JavaScript-rendered page using Selenium via the Grid."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(f"user-agent={ua.random}")

    driver = webdriver.Remote(
        command_executor=SELENIUM_HUB,
        options=options
    )

    try:
        driver.get(url)
        # Wait for the page body to be present before extracting content
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        # Allow extra time for JavaScript to finish rendering
        time.sleep(2)

        return {
            "url": url,
            "title": driver.title,
            "text": driver.find_element(By.TAG_NAME, "body").text[:5000],
            "links": [el.get_attribute("href") for el in driver.find_elements(By.TAG_NAME, "a")]
        }
    finally:
        driver.quit()


def main():
    # Load target URLs from configuration
    with open("config/targets.json") as f:
        targets = json.load(f)

    results = []
    for target in targets:
        url = target["url"]
        mode = target.get("mode", "static")

        print(f"Scraping {url} (mode: {mode})")
        try:
            if mode == "dynamic":
                data = scrape_dynamic(url)
            else:
                data = scrape_static(url)
            results.append(data)
            print(f"  Success: {data['title']}")
        except Exception as e:
            print(f"  Failed: {e}")
            results.append({"url": url, "error": str(e)})

        # Polite delay between requests
        time.sleep(2)

    # Write results to a JSON file
    output_path = os.path.join(OUTPUT_DIR, "results.json")
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {output_path}")


if __name__ == "__main__":
    main()
```

The targets configuration file:

```json
[
  {"url": "https://example.com", "mode": "static"},
  {"url": "https://quotes.toscrape.com", "mode": "static"},
  {"url": "https://quotes.toscrape.com/js/", "mode": "dynamic"}
]
```

## Adding Proxy Rotation

Many websites block scrapers that send too many requests from the same IP. Proxy rotation solves this:

```python
# src/utils.py - Proxy rotation helper
import random
import os


def load_proxies():
    """Load proxy list from environment or file."""
    proxy_file = os.environ.get("PROXY_FILE", "config/proxies.txt")
    if os.path.exists(proxy_file):
        with open(proxy_file) as f:
            return [line.strip() for line in f if line.strip()]
    return []


def get_random_proxy(proxies):
    """Pick a random proxy from the pool."""
    if not proxies:
        return None
    proxy = random.choice(proxies)
    return {"http": proxy, "https": proxy}
```

Use it in your scraper:

```python
# Integrate proxy rotation into static scraping requests
from utils import load_proxies, get_random_proxy

proxies = load_proxies()

def scrape_with_proxy(url):
    headers = {"User-Agent": ua.random}
    proxy = get_random_proxy(proxies)
    response = requests.get(url, headers=headers, proxies=proxy, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "lxml")
```

## Running the Scraper

Launch the entire environment:

```bash
# Build the scraper image and start all services
docker compose up --build -d
```

Scale Chrome nodes for faster parallel scraping:

```bash
# Run 5 Chrome browser nodes for parallel scraping
docker compose up -d --scale chrome-node=5
```

View scraper logs in real time:

```bash
# Follow the scraper container logs
docker compose logs -f scraper
```

Check the Selenium Grid dashboard at `http://localhost:4444` to monitor active browser sessions.

## Rate Limiting and Polite Scraping

Always respect the target website. Add rate limiting to your scraper:

```python
# src/rate_limiter.py - Simple token bucket rate limiter
import time
import threading


class RateLimiter:
    """Limits requests to a specified rate per second."""

    def __init__(self, requests_per_second=1):
        self.interval = 1.0 / requests_per_second
        self.last_request = 0
        self.lock = threading.Lock()

    def wait(self):
        with self.lock:
            elapsed = time.time() - self.last_request
            if elapsed < self.interval:
                time.sleep(self.interval - elapsed)
            self.last_request = time.time()
```

Also check `robots.txt` before scraping any site, and honor the `Crawl-delay` directive if present.

## Wrapping Up

A Docker-based scraping environment gives you browser version control, dependency isolation, easy scaling, and reproducible results. The Selenium Grid approach handles JavaScript-heavy sites, while the requests/BeautifulSoup combo keeps things fast for static content. Combined with proxy rotation and rate limiting, you have a production-grade scraping setup that runs anywhere Docker does.
