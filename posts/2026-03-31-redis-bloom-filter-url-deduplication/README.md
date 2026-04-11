# How to Use Redis Bloom Filters for URL Deduplication in Crawlers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, Web Crawler, Deduplication

Description: Prevent web crawlers from re-crawling already visited URLs using a Redis Bloom Filter for memory-efficient, fast URL deduplication at scale.

---

Web crawlers can encounter billions of URLs. Storing every visited URL in a set or database for deduplication becomes prohibitively expensive. A Redis Bloom Filter provides near-constant-time URL deduplication using a fraction of the memory, making large-scale crawls practical.

## Trade-offs

- **No false negatives**: a URL in the filter will always be found
- **Small false positives**: a tiny fraction of unvisited URLs may be skipped
- **Memory**: a Bloom filter for 1 billion URLs with 0.1% false positive rate uses ~1.8 GB vs. tens of GB for a hash set

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis
```

## Creating the URL Filter

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_url_filter(capacity: int = 500_000_000,
                       error_rate: float = 0.001):
    try:
        r.execute_command('BF.RESERVE', 'crawler:visited_urls',
                          error_rate, capacity)
    except Exception:
        pass  # already exists

create_url_filter()
```

## Normalizing URLs

Consistent normalization prevents duplicate crawls due to URL variations:

```python
from urllib.parse import urlparse, urlunparse, urlencode, parse_qs
import hashlib

def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip().lower())
    # Remove fragment and sort query params
    query = urlencode(sorted(parse_qs(parsed.query).items()), doseq=True)
    normalized = urlunparse((
        parsed.scheme, parsed.netloc,
        parsed.path.rstrip('/') or '/',
        '', query, ''
    ))
    return normalized

def url_key(url: str) -> str:
    # Use MD5 for fixed-length key to avoid very long URLs
    return hashlib.md5(normalize_url(url).encode()).hexdigest()
```

## Core Deduplication Logic

```python
def should_crawl(url: str) -> bool:
    key = url_key(url)
    in_filter = r.execute_command('BF.EXISTS', 'crawler:visited_urls', key)
    return not in_filter  # crawl only if not in filter

def mark_visited(url: str):
    key = url_key(url)
    r.execute_command('BF.ADD', 'crawler:visited_urls', key)

def mark_visited_batch(urls: list):
    keys = [url_key(u) for u in urls]
    if keys:
        r.execute_command('BF.MADD', 'crawler:visited_urls', *keys)
```

## URL Queue with Deduplication

Combine a Redis list queue with the Bloom filter:

```python
QUEUE_KEY = 'crawler:queue'

def enqueue_url(url: str) -> bool:
    if should_crawl(url):
        r.rpush(QUEUE_KEY, url)
        return True
    return False

def enqueue_batch(urls: list) -> int:
    new_urls = [u for u in urls if should_crawl(u)]
    if new_urls:
        r.rpush(QUEUE_KEY, *new_urls)
    return len(new_urls)

def get_next_url() -> str:
    return r.lpop(QUEUE_KEY)

def queue_size() -> int:
    return r.llen(QUEUE_KEY)
```

## Crawler Worker

```python
import time

def crawl_worker(fetch_fn, extract_links_fn,
                  max_urls: int = 1000):
    processed = 0

    while processed < max_urls:
        url = get_next_url()
        if not url:
            time.sleep(0.1)
            continue

        # Mark as visited before crawling to prevent races
        mark_visited(url)

        try:
            html = fetch_fn(url)
            links = extract_links_fn(html, base_url=url)
            new_count = enqueue_batch(links)
            processed += 1
            print(f"Crawled {url} - found {len(links)} links, "
                  f"enqueued {new_count} new")
        except Exception as e:
            print(f"Error crawling {url}: {e}")
```

## Filter Statistics

```python
def get_crawler_stats() -> dict:
    info = r.execute_command('BF.INFO', 'crawler:visited_urls')
    info_dict = dict(zip(info[0::2], info[1::2]))
    queue_len = r.llen(QUEUE_KEY)
    return {
        "urls_visited": info_dict.get('Number of items inserted', 0),
        "queue_size": queue_len,
        "filter_size_bytes": info_dict.get('Size', 0),
        "filter_capacity": info_dict.get('Capacity', 0)
    }

print(get_crawler_stats())
```

## Summary

Redis Bloom Filters are the ideal deduplication backend for web crawlers: they consume a fraction of the memory of a traditional visited-set, provide microsecond membership checks, and scale to billions of URLs. Normalize URLs before hashing to eliminate duplicate crawls due to URL variations, and batch-add discovered links with BF.MADD to minimize round-trips.
