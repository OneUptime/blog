# Validation Summary: How to Build Web Scrapers with BeautifulSoup and Scrapy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (type hints, dataclasses)
- BeautifulSoup 4 (`bs4`) with the `lxml` parser
- `requests` library
- Scrapy framework (Spiders, Items, ItemLoaders, Item Pipelines, Downloader Middleware, settings)
- Playwright (`playwright.sync_api`) for JavaScript-rendered pages
- SQLite (`sqlite3`) and pandas for data export (JSON, JSON Lines, CSV, SQLite, Parquet)
- `urllib.robotparser` for robots.txt compliance
- OpenTelemetry and Prometheus client for observability

## Sources Consulted
- BeautifulSoup documentation — https://www.crummy.com/software/BeautifulSoup/bs4/doc/ (`find_all`, `select`, `select_one`, `get_text`, navigation methods, `find_next_sibling(s)`)
- Scrapy documentation — https://docs.scrapy.org/ (Spiders, Items, ItemLoader, processors `TakeFirst`/`MapCompose`/`Join`, Item Pipelines, Downloader Middleware, settings reference, AutoThrottle, retry middleware)
- Scrapy feed exports — https://docs.scrapy.org/en/latest/topics/feed-exports.html (`FEEDS` setting; deprecation of `FEED_URI`/`FEED_FORMAT`)
- Python `datetime` docs — https://docs.python.org/3/library/datetime.html (deprecation of `datetime.utcnow()` in Python 3.12)
- Playwright for Python — https://playwright.dev/python/ (`sync_playwright`, `goto(wait_until=...)`, `wait_for_selector`, `content`)
- `urllib.robotparser` docs — https://docs.python.org/3/library/urllib.robotparser.html
- w3lib / itemadapter / itemloaders package docs

## Issues Found
1. **Deprecated `datetime.utcnow()` (Python 3.12+)** — Used in the Scrapy spider (`scraped_at`) and in the SQLite pipeline. `datetime.utcnow()` was deprecated in Python 3.12 because it returns a naive datetime. Updated both occurrences to `datetime.now(timezone.utc)` and added `timezone` to the respective `from datetime import ...` imports.
2. **Deprecated `FEED_URI` / `FEED_FORMAT` Scrapy settings** — The "Running Scrapy Programmatically" example configured output via `FEED_URI`/`FEED_FORMAT`, which were deprecated in Scrapy 2.1 in favor of the `FEEDS` setting. Replaced with the equivalent `FEEDS = {"output.json": {"format": "json"}}` form.

## Review Notes
- `CustomRetryMiddleware` calls `self._retry(request, reason, spider)`. This still works in current Scrapy, but the framework now recommends the module-level `get_retry_request()` helper (`from scrapy.downloadermiddlewares.retry import get_retry_request`) for custom retry logic. Left as-is since it remains functional; worth modernizing in a future revision.
- The custom downloader middlewares shown (`RotateUserAgentMiddleware`, `ProxyMiddleware`, etc.) are illustrative and are not registered in the example `settings.py` (`DOWNLOADER_MIDDLEWARES`); readers must add them to take effect. This is acceptable for a tutorial.
- The post correctly notes that neither BeautifulSoup nor Scrapy executes JavaScript and directs readers to Playwright/Selenium — accurate.
- The price-parsing heuristic for ambiguous comma usage (`12,34` vs `1,234`) is documented as making a US-context assumption; this is a reasonable, clearly-flagged simplification rather than an error.
- All BeautifulSoup, Scrapy ItemLoader/pipeline, Playwright, and robots.txt code is syntactically correct and uses current, non-deprecated APIs after the fixes above.
