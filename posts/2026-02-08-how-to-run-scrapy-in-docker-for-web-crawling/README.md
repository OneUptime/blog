# How to Run Scrapy in Docker for Web Crawling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Scrapy, Web Crawling, Python, Data Extraction, Spider, Docker Compose

Description: Deploy Scrapy web crawlers inside Docker containers for consistent, scalable, and reproducible web crawling pipelines.

---

Scrapy is Python's most powerful web crawling framework. It handles request scheduling, retries, rate limiting, and data pipelines out of the box. Running Scrapy in Docker adds deployment consistency and makes it trivial to scale crawlers across multiple machines. This guide covers everything from a basic Dockerized spider to a production-ready crawling stack.

## Why Scrapy in Docker?

Scrapy projects depend on Python, system libraries for XML/HTML parsing, and sometimes database drivers for data pipelines. Different developers and servers may have different versions of these dependencies installed. Docker eliminates these inconsistencies. You build the image once, and it runs the same everywhere.

Docker also makes it straightforward to run multiple spiders in parallel, each in its own container, without worrying about resource contention or port conflicts.

## Project Structure

A clean Scrapy project for Docker looks like this:

```
scrapy-crawler/
  Dockerfile
  docker-compose.yml
  requirements.txt
  scrapy.cfg
  crawler/
    __init__.py
    settings.py
    items.py
    pipelines.py
    middlewares.py
    spiders/
      __init__.py
      quotes_spider.py
```

## Building the Dockerfile

Here is a Dockerfile optimized for Scrapy:

```dockerfile
# Dockerfile - Scrapy crawling environment with all parsing dependencies
FROM python:3.12-slim

# Install system dependencies for lxml and other parsing libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    libssl-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Scrapy project files
COPY scrapy.cfg .
COPY crawler/ ./crawler/

# Create output directory for scraped data
RUN mkdir -p /app/output

CMD ["scrapy", "crawl", "quotes"]
```

The requirements file:

```txt
# requirements.txt - Scrapy and common extensions
scrapy==2.11.1
scrapy-rotating-proxies==0.6.2
scrapy-user-agents==0.1.1
pillow==10.2.0
pymongo==4.6.1
```

## Creating a Spider

Here is a practical spider that crawls a quotes website:

```python
# crawler/spiders/quotes_spider.py - Spider that crawls paginated quote listings
import scrapy
from crawler.items import QuoteItem


class QuotesSpider(scrapy.Spider):
    name = "quotes"
    start_urls = ["http://quotes.toscrape.com/"]

    # Custom settings for this specific spider
    custom_settings = {
        "DOWNLOAD_DELAY": 1.5,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
        "FEEDS": {
            "/app/output/quotes.json": {
                "format": "json",
                "encoding": "utf-8",
                "overwrite": True,
            }
        }
    }

    def parse(self, response):
        """Extract quotes from each page and follow pagination links."""
        for quote in response.css("div.quote"):
            item = QuoteItem()
            item["text"] = quote.css("span.text::text").get()
            item["author"] = quote.css("small.author::text").get()
            item["tags"] = quote.css("div.tags a.tag::text").getall()
            yield item

        # Follow the "next page" link if it exists
        next_page = response.css("li.next a::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
```

Define the item structure:

```python
# crawler/items.py - Data models for scraped items
import scrapy


class QuoteItem(scrapy.Item):
    text = scrapy.Field()
    author = scrapy.Field()
    tags = scrapy.Field()
```

## Scrapy Settings

Configure Scrapy for polite, efficient crawling:

```python
# crawler/settings.py - Scrapy project settings
BOT_NAME = "crawler"
SPIDER_MODULES = ["crawler.spiders"]
NEWSPIDER_MODULE = "crawler.spiders"

# Identify your crawler in requests
USER_AGENT = "MyCrawler/1.0 (+https://example.com/bot)"

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure download delays to avoid overwhelming target servers
DOWNLOAD_DELAY = 1
CONCURRENT_REQUESTS = 8
CONCURRENT_REQUESTS_PER_DOMAIN = 2

# Enable useful middlewares
DOWNLOADER_MIDDLEWARES = {
    "scrapy.downloadermiddlewares.useragent.UserAgentMiddleware": None,
    "scrapy_user_agents.middlewares.RandomUserAgentMiddleware": 400,
}

# Pipeline configuration
ITEM_PIPELINES = {
    "crawler.pipelines.CleanTextPipeline": 100,
    "crawler.pipelines.DuplicateFilterPipeline": 200,
}

# Logging configuration
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

# Cache requests to avoid re-downloading during development
HTTPCACHE_ENABLED = True
HTTPCACHE_DIR = "/app/cache"
```

## Data Pipelines

Process and clean scraped data before it gets saved:

```python
# crawler/pipelines.py - Data cleaning and deduplication pipelines

class CleanTextPipeline:
    """Remove extra whitespace and normalize text fields."""

    def process_item(self, item, spider):
        if item.get("text"):
            # Strip curly quotes and extra whitespace
            text = item["text"]
            text = text.replace("\u201c", '"').replace("\u201d", '"')
            item["text"] = text.strip()
        return item


class DuplicateFilterPipeline:
    """Drop duplicate items based on their text content."""

    def __init__(self):
        self.seen = set()

    def process_item(self, item, spider):
        text = item.get("text", "")
        if text in self.seen:
            raise scrapy.exceptions.DropItem(f"Duplicate quote: {text[:50]}...")
        self.seen.add(text)
        return item
```

## Docker Compose with MongoDB Storage

For production crawling, store results in MongoDB instead of flat files:

```yaml
# docker-compose.yml - Scrapy crawler with MongoDB for persistent storage
version: "3.8"

services:
  mongodb:
    image: mongo:7
    volumes:
      - mongodata:/data/db
    networks:
      - crawlnet

  spider-quotes:
    build: .
    depends_on:
      - mongodb
    environment:
      MONGO_URI: mongodb://mongodb:27017
      MONGO_DATABASE: scraped_data
    volumes:
      # Mount output directory for JSON feed exports
      - ./output:/app/output
    command: ["scrapy", "crawl", "quotes"]
    networks:
      - crawlnet

  # Additional spider for a different site
  spider-books:
    build: .
    depends_on:
      - mongodb
    environment:
      MONGO_URI: mongodb://mongodb:27017
      MONGO_DATABASE: scraped_data
    command: ["scrapy", "crawl", "books"]
    networks:
      - crawlnet

volumes:
  mongodata:

networks:
  crawlnet:
    driver: bridge
```

Add a MongoDB pipeline to your settings and pipelines:

```python
# crawler/pipelines.py - MongoDB storage pipeline (add to existing file)
import pymongo
import os


class MongoPipeline:
    """Store scraped items in a MongoDB collection."""

    def open_spider(self, spider):
        mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
        mongo_db = os.environ.get("MONGO_DATABASE", "scraped_data")
        self.client = pymongo.MongoClient(mongo_uri)
        self.db = self.client[mongo_db]
        self.collection = self.db[spider.name]

    def close_spider(self, spider):
        self.client.close()

    def process_item(self, item, spider):
        self.collection.insert_one(dict(item))
        return item
```

## Running the Crawler

Build and run a specific spider:

```bash
# Build the Docker image and run the quotes spider
docker compose up --build spider-quotes
```

Run all spiders at once:

```bash
# Launch all services including both spiders and MongoDB
docker compose up --build -d
```

Check crawler progress through logs:

```bash
# Follow the real-time output of the quotes spider
docker compose logs -f spider-quotes
```

Run an ad-hoc spider with custom arguments:

```bash
# Run a spider with custom settings passed as arguments
docker run --rm \
  -v $(pwd)/output:/app/output \
  scrapy-crawler \
  scrapy crawl quotes -a category=humor -s CLOSESPIDER_ITEMCOUNT=50
```

## Scheduling Recurring Crawls

Use cron inside a scheduler container to run spiders on a schedule:

```yaml
# Add to docker-compose.yml - Cron-based spider scheduler
  scheduler:
    build: .
    entrypoint: ["/bin/bash", "-c"]
    command:
      - |
        apt-get update && apt-get install -y cron
        echo "0 2 * * * cd /app && scrapy crawl quotes >> /var/log/crawl.log 2>&1" > /etc/cron.d/crawler
        chmod 0644 /etc/cron.d/crawler
        crontab /etc/cron.d/crawler
        cron -f
    depends_on:
      - mongodb
    environment:
      MONGO_URI: mongodb://mongodb:27017
      MONGO_DATABASE: scraped_data
    networks:
      - crawlnet
```

This runs the quotes spider every day at 2 AM.

## Performance Tuning

For large crawling jobs, tune these Scrapy settings:

```python
# Performance-focused settings for large crawling jobs
CONCURRENT_REQUESTS = 32
CONCURRENT_REQUESTS_PER_DOMAIN = 8
DOWNLOAD_DELAY = 0.5
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 4.0

# Disable unnecessary features to save memory
TELNETCONSOLE_ENABLED = False
COOKIES_ENABLED = False
```

The `AUTOTHROTTLE` settings automatically adjust request rates based on server response times, which prevents you from overloading targets.

## Wrapping Up

Scrapy in Docker gives you a reproducible, scalable web crawling setup. The framework handles the hard parts of crawling (scheduling, retries, rate limiting, data pipelines) while Docker handles deployment and isolation. Whether you run a single spider or dozens in parallel, the Docker Compose configuration keeps everything manageable and consistent.
