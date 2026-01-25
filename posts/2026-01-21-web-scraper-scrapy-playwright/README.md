# How to Build a Web Scraper with Scrapy and Playwright

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scrapy, Playwright, Web Scraping, Data Extraction, Browser Automation, JavaScript Rendering

Description: Learn how to build powerful web scrapers in Python using Scrapy and Playwright. This guide covers handling JavaScript-rendered pages, managing sessions, avoiding detection, and structuring large-scale scraping projects.

---

> Modern websites rely heavily on JavaScript to render content. Traditional scraping tools cannot see this content. Combining Scrapy with Playwright gives you the best of both worlds: Scrapy's powerful crawling framework with Playwright's browser automation capabilities for JavaScript-heavy sites.

Web scraping has evolved significantly. Ten years ago, most websites served static HTML that could be parsed directly. Today, single-page applications and client-side rendering mean the HTML you fetch often contains little useful data. The real content loads via JavaScript after the page renders in a browser.

---

## Why Scrapy + Playwright?

Scrapy is the most mature web scraping framework in Python. It handles concurrent requests, retry logic, caching, and data pipelines. Playwright is a browser automation library that can render JavaScript and interact with pages like a real user.

Together they provide:

- **JavaScript rendering** - See the same content as browser users
- **Concurrency** - Process multiple pages in parallel
- **Session management** - Handle cookies and authentication
- **Data pipelines** - Clean and store scraped data
- **Retry logic** - Automatically retry failed requests

---

## Project Setup

### Installation

Install Scrapy, Playwright, and the integration library:

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install scrapy scrapy-playwright playwright

# Install browser binaries
playwright install chromium
```

### Project Structure

Create a new Scrapy project:

```bash
scrapy startproject product_scraper
cd product_scraper
```

Your project structure will look like this:

```
product_scraper/
    scrapy.cfg
    product_scraper/
        __init__.py
        items.py          # Data models
        middlewares.py    # Request/response processing
        pipelines.py      # Data processing pipelines
        settings.py       # Scrapy configuration
        spiders/
            __init__.py
            products.py   # Your spider
```

---

## Configuring Scrapy for Playwright

### Settings Configuration

Configure Scrapy to use Playwright for rendering:

```python
# product_scraper/settings.py
# Scrapy settings with Playwright integration

BOT_NAME = "product_scraper"
SPIDER_MODULES = ["product_scraper.spiders"]
NEWSPIDER_MODULE = "product_scraper.spiders"

# Crawl responsibly by identifying yourself
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Obey robots.txt rules
ROBOTSTXT_OBEY = True

# Configure maximum concurrent requests
CONCURRENT_REQUESTS = 8

# Add a download delay to be respectful
DOWNLOAD_DELAY = 1

# Enable Playwright download handler
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}

# Twisted reactor for async support
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"

# Playwright launch options
PLAYWRIGHT_BROWSER_TYPE = "chromium"
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
    "timeout": 30000,  # 30 seconds
}

# Default Playwright context options
PLAYWRIGHT_CONTEXTS = {
    "default": {
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
        "java_script_enabled": True,
    }
}

# Enable item pipelines
ITEM_PIPELINES = {
    "product_scraper.pipelines.CleaningPipeline": 100,
    "product_scraper.pipelines.ValidationPipeline": 200,
    "product_scraper.pipelines.JsonWriterPipeline": 300,
}

# Configure logging
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

# Retry configuration
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# Cache for development (disable in production)
# HTTPCACHE_ENABLED = True
# HTTPCACHE_EXPIRATION_SECS = 86400
# HTTPCACHE_DIR = "httpcache"
```

---

## Defining Data Items

### Creating Item Models

Define the data structure for scraped items:

```python
# product_scraper/items.py
# Item definitions for scraped data
import scrapy
from itemloaders.processors import TakeFirst, MapCompose, Join
from w3lib.html import remove_tags


def clean_price(value):
    """Extract numeric price from string."""
    if value:
        # Remove currency symbols and commas
        cleaned = value.replace('$', '').replace(',', '').strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def clean_text(value):
    """Clean whitespace from text."""
    if value:
        return ' '.join(value.split())
    return value


class ProductItem(scrapy.Item):
    """Item representing a product listing."""

    # Basic product information
    name = scrapy.Field(
        input_processor=MapCompose(remove_tags, clean_text),
        output_processor=TakeFirst()
    )
    price = scrapy.Field(
        input_processor=MapCompose(remove_tags, clean_price),
        output_processor=TakeFirst()
    )
    original_price = scrapy.Field(
        input_processor=MapCompose(remove_tags, clean_price),
        output_processor=TakeFirst()
    )
    currency = scrapy.Field(output_processor=TakeFirst())
    sku = scrapy.Field(output_processor=TakeFirst())

    # Product details
    description = scrapy.Field(
        input_processor=MapCompose(remove_tags, clean_text),
        output_processor=Join('\n')
    )
    category = scrapy.Field(output_processor=TakeFirst())
    brand = scrapy.Field(output_processor=TakeFirst())

    # Availability
    in_stock = scrapy.Field(output_processor=TakeFirst())
    stock_count = scrapy.Field(output_processor=TakeFirst())

    # Images
    image_urls = scrapy.Field()
    images = scrapy.Field()

    # Reviews
    rating = scrapy.Field(output_processor=TakeFirst())
    review_count = scrapy.Field(output_processor=TakeFirst())

    # Metadata
    url = scrapy.Field(output_processor=TakeFirst())
    scraped_at = scrapy.Field(output_processor=TakeFirst())


class ReviewItem(scrapy.Item):
    """Item representing a product review."""

    product_sku = scrapy.Field(output_processor=TakeFirst())
    author = scrapy.Field(output_processor=TakeFirst())
    rating = scrapy.Field(output_processor=TakeFirst())
    title = scrapy.Field(output_processor=TakeFirst())
    text = scrapy.Field(
        input_processor=MapCompose(remove_tags, clean_text),
        output_processor=TakeFirst()
    )
    date = scrapy.Field(output_processor=TakeFirst())
    verified_purchase = scrapy.Field(output_processor=TakeFirst())
```

---

## Building the Spider

### Basic Playwright Spider

Create a spider that uses Playwright for JavaScript rendering:

```python
# product_scraper/spiders/products.py
# Product spider with Playwright integration
import scrapy
from scrapy_playwright.page import PageMethod
from itemloaders import ItemLoader
from datetime import datetime

from product_scraper.items import ProductItem


class ProductSpider(scrapy.Spider):
    """
    Spider for scraping product listings.
    Uses Playwright to render JavaScript-heavy pages.
    """

    name = "products"
    allowed_domains = ["example-shop.com"]

    # Starting URLs for the crawl
    start_urls = [
        "https://example-shop.com/category/electronics",
        "https://example-shop.com/category/clothing",
    ]

    def start_requests(self):
        """Generate initial requests with Playwright."""
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                callback=self.parse_category,
                meta={
                    "playwright": True,
                    "playwright_include_page": True,
                    "playwright_page_methods": [
                        # Wait for products to load
                        PageMethod("wait_for_selector", ".product-grid"),
                        # Scroll to load lazy images
                        PageMethod("evaluate", "window.scrollTo(0, document.body.scrollHeight)"),
                        PageMethod("wait_for_timeout", 1000),
                    ],
                },
                errback=self.handle_error,
            )

    async def parse_category(self, response):
        """
        Parse category page and extract product links.
        Also handles pagination.
        """
        page = response.meta.get("playwright_page")

        try:
            # Extract product links from the rendered page
            product_links = response.css(".product-card a.product-link::attr(href)").getall()

            self.logger.info(f"Found {len(product_links)} products on {response.url}")

            # Follow each product link
            for link in product_links:
                yield response.follow(
                    link,
                    callback=self.parse_product,
                    meta={
                        "playwright": True,
                        "playwright_page_methods": [
                            PageMethod("wait_for_selector", ".product-details"),
                        ],
                    },
                )

            # Handle pagination
            next_page = response.css("a.pagination-next::attr(href)").get()
            if next_page:
                yield response.follow(
                    next_page,
                    callback=self.parse_category,
                    meta={
                        "playwright": True,
                        "playwright_include_page": True,
                        "playwright_page_methods": [
                            PageMethod("wait_for_selector", ".product-grid"),
                        ],
                    },
                )

        finally:
            # Always close the page to free resources
            if page:
                await page.close()

    def parse_product(self, response):
        """Parse individual product page and extract data."""
        loader = ItemLoader(item=ProductItem(), response=response)

        # Basic information
        loader.add_css("name", "h1.product-title::text")
        loader.add_css("price", ".current-price::text")
        loader.add_css("original_price", ".original-price::text")
        loader.add_value("currency", "USD")

        # Product identifiers
        loader.add_css("sku", ".product-sku::text")
        loader.add_css("brand", ".product-brand::text")

        # Description - might be in multiple elements
        loader.add_css("description", ".product-description p::text")

        # Category from breadcrumbs
        loader.add_css("category", ".breadcrumb li:last-child a::text")

        # Stock status
        in_stock_text = response.css(".stock-status::text").get()
        loader.add_value("in_stock", "in stock" in (in_stock_text or "").lower())

        # Images
        image_urls = response.css(".product-gallery img::attr(src)").getall()
        loader.add_value("image_urls", image_urls)

        # Reviews
        loader.add_css("rating", ".rating-value::text")
        loader.add_css("review_count", ".review-count::text")

        # Metadata
        loader.add_value("url", response.url)
        loader.add_value("scraped_at", datetime.utcnow().isoformat())

        yield loader.load_item()

    def handle_error(self, failure):
        """Handle request failures."""
        self.logger.error(f"Request failed: {failure.request.url}")
        self.logger.error(f"Error: {failure.value}")
```

---

## Handling Dynamic Content

### Infinite Scroll and Load More

Handle pages with infinite scroll or "Load More" buttons:

```python
# product_scraper/spiders/infinite_scroll.py
# Spider for handling infinite scroll pages
import scrapy
from scrapy_playwright.page import PageMethod


class InfiniteScrollSpider(scrapy.Spider):
    """Spider that handles infinite scroll pagination."""

    name = "infinite_scroll"

    def start_requests(self):
        yield scrapy.Request(
            "https://example-shop.com/products",
            callback=self.parse,
            meta={
                "playwright": True,
                "playwright_include_page": True,
            },
        )

    async def parse(self, response):
        page = response.meta["playwright_page"]

        try:
            # Scroll and load all content
            previous_height = 0
            max_scrolls = 10  # Limit to prevent infinite loops

            for _ in range(max_scrolls):
                # Scroll to bottom
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

                # Wait for new content to load
                await page.wait_for_timeout(2000)

                # Check if we've reached the end
                current_height = await page.evaluate("document.body.scrollHeight")
                if current_height == previous_height:
                    break
                previous_height = current_height

            # Get the fully loaded page content
            content = await page.content()

            # Create new response with complete content
            from scrapy.http import HtmlResponse
            new_response = HtmlResponse(
                url=response.url,
                body=content.encode(),
                encoding='utf-8',
            )

            # Extract all products from the complete page
            for product in new_response.css(".product-card"):
                yield {
                    "name": product.css(".product-name::text").get(),
                    "price": product.css(".product-price::text").get(),
                    "url": product.css("a::attr(href)").get(),
                }

        finally:
            await page.close()


class LoadMoreSpider(scrapy.Spider):
    """Spider that clicks 'Load More' buttons."""

    name = "load_more"

    def start_requests(self):
        yield scrapy.Request(
            "https://example-shop.com/search?q=electronics",
            callback=self.parse,
            meta={
                "playwright": True,
                "playwright_include_page": True,
            },
        )

    async def parse(self, response):
        page = response.meta["playwright_page"]

        try:
            # Click "Load More" until it disappears or limit reached
            clicks = 0
            max_clicks = 5

            while clicks < max_clicks:
                load_more = page.locator("button.load-more")

                # Check if button exists and is visible
                if await load_more.count() == 0:
                    break

                if not await load_more.is_visible():
                    break

                # Click the button
                await load_more.click()

                # Wait for new content
                await page.wait_for_timeout(2000)
                clicks += 1

                self.logger.info(f"Clicked 'Load More' {clicks} times")

            # Extract data from complete page
            content = await page.content()
            from scrapy.http import HtmlResponse
            new_response = HtmlResponse(
                url=response.url,
                body=content.encode(),
            )

            for product in new_response.css(".product-item"):
                yield {
                    "name": product.css("h3::text").get(),
                    "price": product.css(".price::text").get(),
                }

        finally:
            await page.close()
```

---

## Handling Authentication

### Login and Session Management

Scrape authenticated content by maintaining sessions:

```python
# product_scraper/spiders/authenticated.py
# Spider with authentication support
import scrapy
from scrapy_playwright.page import PageMethod


class AuthenticatedSpider(scrapy.Spider):
    """Spider that logs in before scraping."""

    name = "authenticated"

    def __init__(self, username=None, password=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.username = username or "user@example.com"
        self.password = password or "password123"

    def start_requests(self):
        """Start by visiting the login page."""
        yield scrapy.Request(
            "https://example-shop.com/login",
            callback=self.login,
            meta={
                "playwright": True,
                "playwright_include_page": True,
                "playwright_context": "authenticated",  # Named context
            },
        )

    async def login(self, response):
        """Fill in login form and submit."""
        page = response.meta["playwright_page"]

        try:
            # Fill login form
            await page.fill("input[name='email']", self.username)
            await page.fill("input[name='password']", self.password)

            # Click login button
            await page.click("button[type='submit']")

            # Wait for navigation to complete
            await page.wait_for_url("**/dashboard**", timeout=10000)

            self.logger.info("Login successful")

            # Now scrape authenticated pages using same context
            yield scrapy.Request(
                "https://example-shop.com/account/orders",
                callback=self.parse_orders,
                meta={
                    "playwright": True,
                    "playwright_context": "authenticated",
                    "playwright_page_methods": [
                        PageMethod("wait_for_selector", ".orders-list"),
                    ],
                },
            )

        except Exception as e:
            self.logger.error(f"Login failed: {e}")

        finally:
            await page.close()

    def parse_orders(self, response):
        """Parse order history from authenticated page."""
        for order in response.css(".order-row"):
            yield {
                "order_id": order.css(".order-id::text").get(),
                "date": order.css(".order-date::text").get(),
                "total": order.css(".order-total::text").get(),
                "status": order.css(".order-status::text").get(),
            }
```

---

## Data Pipelines

### Processing and Validating Data

Create pipelines to clean and store scraped data:

```python
# product_scraper/pipelines.py
# Data processing pipelines
import json
import re
from datetime import datetime
from itemadapter import ItemAdapter


class CleaningPipeline:
    """Pipeline for cleaning and normalizing data."""

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)

        # Clean price fields
        if adapter.get('price'):
            adapter['price'] = self._clean_price(adapter['price'])

        if adapter.get('original_price'):
            adapter['original_price'] = self._clean_price(adapter['original_price'])

        # Clean text fields
        if adapter.get('name'):
            adapter['name'] = self._clean_text(adapter['name'])

        if adapter.get('description'):
            adapter['description'] = self._clean_text(adapter['description'])

        # Parse review count
        if adapter.get('review_count'):
            adapter['review_count'] = self._extract_number(adapter['review_count'])

        # Parse rating
        if adapter.get('rating'):
            adapter['rating'] = self._extract_rating(adapter['rating'])

        return item

    def _clean_price(self, value):
        """Extract numeric price value."""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove currency symbols and extract number
            match = re.search(r'[\d,]+\.?\d*', value.replace(',', ''))
            if match:
                return float(match.group())
        return None

    def _clean_text(self, value):
        """Normalize whitespace in text."""
        if value:
            return ' '.join(str(value).split())
        return value

    def _extract_number(self, value):
        """Extract integer from string like '(42 reviews)'."""
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            match = re.search(r'\d+', value)
            if match:
                return int(match.group())
        return None

    def _extract_rating(self, value):
        """Extract rating from string like '4.5 out of 5'."""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            match = re.search(r'(\d+\.?\d*)', value)
            if match:
                return float(match.group(1))
        return None


class ValidationPipeline:
    """Pipeline for validating items."""

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)

        # Require essential fields
        if not adapter.get('name'):
            raise DropItem(f"Missing name in {item}")

        if not adapter.get('url'):
            raise DropItem(f"Missing URL in {item}")

        # Validate price is positive
        price = adapter.get('price')
        if price is not None and price < 0:
            raise DropItem(f"Invalid price {price} in {item}")

        # Validate rating is in range
        rating = adapter.get('rating')
        if rating is not None and not (0 <= rating <= 5):
            spider.logger.warning(f"Rating {rating} out of range for {adapter.get('url')}")
            adapter['rating'] = None

        return item


class JsonWriterPipeline:
    """Pipeline that writes items to JSON file."""

    def open_spider(self, spider):
        """Open file when spider starts."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"products_{spider.name}_{timestamp}.jsonl"
        self.file = open(filename, 'w', encoding='utf-8')
        spider.logger.info(f"Writing output to {filename}")

    def close_spider(self, spider):
        """Close file when spider finishes."""
        self.file.close()

    def process_item(self, item, spider):
        """Write each item as a JSON line."""
        line = json.dumps(ItemAdapter(item).asdict(), ensure_ascii=False)
        self.file.write(line + '\n')
        return item


class DuplicatesPipeline:
    """Pipeline that filters duplicate items."""

    def __init__(self):
        self.seen_urls = set()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        url = adapter.get('url')

        if url in self.seen_urls:
            raise DropItem(f"Duplicate item found: {url}")

        self.seen_urls.add(url)
        return item


from scrapy.exceptions import DropItem
```

---

## Avoiding Detection

### Best Practices for Stealth

Configure your spider to avoid detection:

```python
# product_scraper/middlewares.py
# Custom middlewares for stealth scraping
import random
from scrapy import signals


class RandomUserAgentMiddleware:
    """Rotate user agents to avoid detection."""

    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    ]

    def process_request(self, request, spider):
        request.headers['User-Agent'] = random.choice(self.USER_AGENTS)


class RandomDelayMiddleware:
    """Add random delays between requests."""

    def __init__(self, min_delay=1, max_delay=3):
        self.min_delay = min_delay
        self.max_delay = max_delay

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            min_delay=crawler.settings.getfloat('RANDOM_DELAY_MIN', 1),
            max_delay=crawler.settings.getfloat('RANDOM_DELAY_MAX', 3),
        )

    def process_request(self, request, spider):
        import time
        delay = random.uniform(self.min_delay, self.max_delay)
        time.sleep(delay)
```

Add to settings.py:

```python
# Enable custom middlewares
DOWNLOADER_MIDDLEWARES = {
    "product_scraper.middlewares.RandomUserAgentMiddleware": 400,
    "product_scraper.middlewares.RandomDelayMiddleware": 500,
}

# Randomize delays
RANDOM_DELAY_MIN = 1
RANDOM_DELAY_MAX = 3

# Disable cookies to reduce fingerprinting
COOKIES_ENABLED = False

# Playwright stealth options
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
    "args": [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
    ],
}
```

---

## Running the Spider

### Command Line Usage

Run your spider with various options:

```bash
# Basic run
scrapy crawl products

# Save to JSON file
scrapy crawl products -o products.json

# Save to CSV
scrapy crawl products -o products.csv

# Run with custom settings
scrapy crawl products -s CONCURRENT_REQUESTS=4 -s DOWNLOAD_DELAY=2

# Run with arguments
scrapy crawl authenticated -a username=user@example.com -a password=secret

# Run with logging
scrapy crawl products --loglevel=DEBUG
```

---

## Best Practices

1. **Respect robots.txt** - Always check and follow site rules
2. **Use delays** - Do not hammer servers with requests
3. **Handle errors gracefully** - Implement proper error callbacks
4. **Close pages** - Always close Playwright pages to free memory
5. **Use named contexts** - Maintain separate sessions when needed
6. **Validate data** - Use pipelines to ensure data quality
7. **Monitor resource usage** - Playwright can consume significant memory
8. **Cache during development** - Enable HTTP cache to speed up testing

---

*Running web scrapers in production? [OneUptime](https://oneuptime.com) provides monitoring for your scraping infrastructure with alerts for failures, rate limits, and data quality issues.*

**Related Reading:**
- [How to Build REST APIs with FastAPI and SQLAlchemy](https://oneuptime.com/blog/post/2026-01-25-fastapi-sqlalchemy-rest-apis/view)
- [How to Implement CQRS Pattern in Python](https://oneuptime.com/blog/post/2026-01-22-cqrs-pattern-python/view)
