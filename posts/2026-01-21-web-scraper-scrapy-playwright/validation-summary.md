# Validation Summary: How to Build a Web Scraper with Scrapy and Playwright

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Scrapy
- scrapy-playwright
- Playwright for Python
- Twisted asyncio reactor
- Scrapy item loaders and item pipelines
- Scrapy downloader middleware
- Web scraping and JavaScript rendering

## Sources Consulted
- Scrapy-playwright official README: https://github.com/scrapy-plugins/scrapy-playwright
- Scrapy command line tool documentation: https://docs.scrapy.org/en/latest/topics/commands.html
- Scrapy spider documentation: https://docs.scrapy.org/en/latest/topics/spiders.html
- Scrapy coroutine documentation: https://docs.scrapy.org/en/latest/topics/coroutines.html
- Scrapy item loader documentation: https://docs.scrapy.org/en/latest/topics/loaders.html
- Scrapy item pipeline documentation: https://docs.scrapy.org/en/latest/topics/item-pipeline.html
- Scrapy downloader middleware documentation: https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
- Scrapy settings documentation: https://docs.scrapy.org/en/latest/topics/settings.html
- Scrapy architecture overview: https://docs.scrapy.org/en/latest/topics/architecture.html
- Playwright Python Page API documentation: https://playwright.dev/python/docs/api/class-page
- Playwright Python Locator API documentation: https://playwright.dev/python/docs/api/class-locator
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The spider examples used `start_requests()`, which was deprecated in Scrapy 2.13 and removed in Scrapy 2.16. Changed the examples to use `async def start()` so they match current Scrapy behavior.
- The product spider used `datetime.utcnow()`, which is deprecated in Python 3.12 and returns a naive datetime. Replaced it with `datetime.now(UTC).isoformat()` and imported `UTC`.
- The custom `RandomDelayMiddleware` used `time.sleep()` inside Scrapy downloader middleware, which blocks Scrapy's event-driven concurrency model. Removed that middleware and used Scrapy's built-in `DOWNLOAD_DELAY` with `RANDOMIZE_DOWNLOAD_DELAY`.
- The stealth settings disabled cookies globally, which conflicts with the authentication/session-management example. Changed the setting to a commented option and noted that cookies should remain enabled for login/session spiders.
- The `DropItem` import appeared after pipeline class definitions. Moved it to the top of the pipeline snippet with the other imports for clearer, conventional module structure.

## Review Notes
The remaining examples are illustrative and use placeholder selectors/domains, so they still need site-specific selector updates before use against a real target. The Playwright and scrapy-playwright configuration patterns, Scrapy CLI commands, item loader usage, and pipeline structure were otherwise consistent with the consulted documentation.
