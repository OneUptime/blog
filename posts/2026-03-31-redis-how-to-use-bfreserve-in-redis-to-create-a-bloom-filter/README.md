# How to Use BF.RESERVE in Redis to Create a Bloom Filter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisBloom, Bloom Filter, Probabilistic, Data Structure

Description: Learn how to use BF.RESERVE in Redis to create a Bloom filter with custom error rate and capacity settings for efficient membership testing.

---

## What Is BF.RESERVE?

`BF.RESERVE` creates a new Bloom filter in Redis with a specified false positive rate and initial capacity. Bloom filters are probabilistic data structures that test whether an item is a member of a set. They can return false positives (an item appears to be present but is not) but never false negatives (a present item is never missed).

`BF.RESERVE` lets you tune the filter for your use case by specifying how accurate it should be and how many items it needs to handle.

## Basic Syntax

```text
BF.RESERVE key error_rate capacity
  [EXPANSION expansion]
  [NONSCALING]
```

Parameters:
- `key` - the Redis key for the Bloom filter
- `error_rate` - desired false positive probability (0.0 to 1.0, e.g., 0.01 = 1%)
- `capacity` - expected number of unique items to be inserted
- `EXPANSION` - growth factor when the filter is full (default: 2)
- `NONSCALING` - disable automatic scaling (fixed capacity filter)

## Creating a Basic Bloom Filter

```bash
# Create a filter for 1 million items with 1% error rate
BF.RESERVE myfilter 0.01 1000000
# Returns: OK

# Create a tighter filter (0.1% false positive rate)
BF.RESERVE strict_filter 0.001 500000
# Returns: OK
```

## How Error Rate Affects Memory

A lower error rate requires more memory. The relationship:

```bash
# 1% error rate, 1M items
BF.RESERVE filter_1pct 0.01 1000000
# Memory: ~1.7 MB

# 0.1% error rate, 1M items
BF.RESERVE filter_01pct 0.001 1000000
# Memory: ~2.5 MB

# 0.01% error rate, 1M items
BF.RESERVE filter_001pct 0.0001 1000000
# Memory: ~3.4 MB
```

## Adding Items and Checking Membership

```bash
# Add items
BF.ADD myfilter "user@example.com"
# Returns: 1 (new item added)

BF.ADD myfilter "admin@example.com"
# Returns: 1

BF.ADD myfilter "user@example.com"
# Returns: 0 (already in filter)

# Check membership
BF.EXISTS myfilter "user@example.com"
# Returns: 1 (exists)

BF.EXISTS myfilter "unknown@example.com"
# Returns: 0 (definitely does not exist)
```

## Non-Scaling Filters

By default, Bloom filters in Redis grow automatically when they reach capacity. Use `NONSCALING` for a fixed-capacity filter that returns an error when full:

```bash
# Fixed-size filter - does not grow beyond capacity
BF.RESERVE fixed_filter 0.01 10000 NONSCALING

# Attempt to add beyond capacity returns an error
# BF.ADD fixed_filter item  <- Error after 10000 items
```

## Expansion Factor

When the filter fills up and `NONSCALING` is not set, a new sub-filter is created. The `EXPANSION` factor controls how much larger each new sub-filter is:

```bash
# Each new sub-filter is 2x the previous (default)
BF.RESERVE myfilter 0.01 100000 EXPANSION 2

# More aggressive scaling
BF.RESERVE growing_filter 0.01 100000 EXPANSION 4
```

## Practical Use Case: URL Deduplication

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Create a Bloom filter for web crawler URL deduplication
# Expect up to 10 million URLs, 0.1% false positive rate
r.execute_command('BF.RESERVE', 'crawled_urls', 0.001, 10000000)

def should_crawl(url):
    """Check if a URL has already been crawled."""
    already_crawled = r.execute_command('BF.EXISTS', 'crawled_urls', url)
    if already_crawled:
        return False  # Skip (might be false positive, but acceptable)

    # Mark as crawled
    r.execute_command('BF.ADD', 'crawled_urls', url)
    return True

urls = [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page1',  # Duplicate
    'https://example.com/page3',
]

for url in urls:
    if should_crawl(url):
        print(f"Crawling: {url}")
    else:
        print(f"Skipping (already seen): {url}")
```

## Practical Use Case: Email Seen Before

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Check if an email address has been used before
r.execute_command('BF.RESERVE', 'seen_emails', 0.001, 5000000)

def is_new_email(email):
    """Returns True if email has not been seen before."""
    return not r.execute_command('BF.EXISTS', 'seen_emails', email)

def register_email(email):
    r.execute_command('BF.ADD', 'seen_emails', email)

# Test
print(is_new_email('alice@example.com'))  # True
register_email('alice@example.com')
print(is_new_email('alice@example.com'))  # False
```

## Getting Filter Info

```bash
BF.INFO myfilter
```

```text
 1) Capacity
 2) (integer) 1000000
 3) Size
 4) (integer) 1761840
 5) Number of filters
 6) (integer) 1
 7) Number of items inserted
 8) (integer) 42
 9) Expansion rate
10) (integer) 2
```

## When to Use BF.RESERVE vs BF.ADD

- Use `BF.RESERVE` when you know expected item count and can tune error rate
- Use `BF.ADD` on a non-reserved key for auto-created filters with default settings (0.01 error, 100 initial capacity, expansion 2)

## Summary

`BF.RESERVE` creates a pre-configured Bloom filter in Redis with precise control over false positive rate and item capacity. Bloom filters are ideal for membership testing at scale where a small number of false positives are acceptable - common applications include URL deduplication in web crawlers, email deduplication, cache invalidation guards, and preventing duplicate processing in event pipelines. Always use `BF.RESERVE` when you know your expected item count to avoid unnecessary memory growth from the auto-scaling expansion mechanism.
