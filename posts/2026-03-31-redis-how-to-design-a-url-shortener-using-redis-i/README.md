# How to Design a URL Shortener Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, URL Shortener, Interview, Scalability, Architecture

Description: A complete system design walkthrough for building a URL shortener using Redis, covering data modeling, short code generation, and scalability strategies.

---

## Problem Statement

Design a URL shortening service like bit.ly that:
- Converts long URLs to short codes (e.g., https://short.ly/abc123)
- Redirects users from short URL to original URL
- Handles 100M URLs stored, 10K writes/sec, 100K reads/sec

## High-Level Architecture

```text
Client
  |
  v
Load Balancer
  |
  +----> URL Shortener API Servers
               |
               +----> Redis (hot URL cache + counter)
               |
               +----> Primary Database (MySQL/PostgreSQL - source of truth)
```

## Core Data Model

### In the Primary Database

```sql
CREATE TABLE urls (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    short_code  VARCHAR(10) UNIQUE NOT NULL,
    long_url    TEXT NOT NULL,
    user_id     BIGINT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP,
    click_count BIGINT DEFAULT 0
);
```

### In Redis

```text
Key Pattern                     Value           TTL
-----------                     -----           ---
url:short:{code}                long URL        24 hours (hot cache)
url:counter                     integer         None (global counter)
url:user:{userId}:count         integer         1 hour (per-user limit)
url:click:{code}                integer         1 hour (click buffer)
```

## Short Code Generation Strategies

### Strategy 1: Base62 Encoding of Auto-Increment ID

```python
import redis
import string

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
CHARS = string.digits + string.ascii_letters  # 0-9, a-z, A-Z = 62 chars

def encode_base62(num: int) -> str:
    if num == 0:
        return CHARS[0]
    result = []
    while num:
        result.append(CHARS[num % 62])
        num //= 62
    return ''.join(reversed(result))

def generate_short_code() -> str:
    # Atomic increment gives unique ID
    seq_id = r.incr('url:counter')
    return encode_base62(seq_id)

# ID 1 -> "1", ID 62 -> "10", ID 3844 -> "100"
# 6-char code handles 62^6 = ~56 billion URLs
```

### Strategy 2: Hashing with Collision Handling

```python
import hashlib
import base64

def hash_url(long_url: str, attempt: int = 0) -> str:
    salted = f"{long_url}:{attempt}"
    hash_bytes = hashlib.md5(salted.encode()).digest()
    # Take first 6 chars of base64
    code = base64.urlsafe_b64encode(hash_bytes)[:6].decode()
    return code
```

## Redis Caching Layer

```python
import hashlib

CACHE_TTL = 86400  # 24 hours

def get_long_url(short_code: str) -> str | None:
    # Check Redis cache first
    cached = r.get(f"url:short:{short_code}")
    if cached:
        r.incr(f"url:click:{short_code}")  # Buffer click count
        return cached

    # Cache miss - fetch from database
    long_url = fetch_from_db(short_code)
    if long_url:
        r.setex(f"url:short:{short_code}", CACHE_TTL, long_url)
        r.incr(f"url:click:{short_code}")

    return long_url

def shorten_url(long_url: str, user_id: int | None = None) -> str:
    # Check if URL already shortened (deduplication)
    existing = r.get(f"url:long:{hashlib.md5(long_url.encode()).hexdigest()}")
    if existing:
        return existing

    short_code = generate_short_code()

    # Store in database (source of truth)
    save_to_db(short_code, long_url, user_id)

    # Cache in Redis
    r.setex(f"url:short:{short_code}", CACHE_TTL, long_url)

    return short_code
```

## Click Count Tracking

Use Redis to buffer click counts, flush to DB periodically:

```python
import time

def flush_click_counts():
    """Periodically flush click counts from Redis to database."""
    pattern = "url:click:*"
    cursor = 0

    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)

        for key in keys:
            short_code = key.split(':')[-1]
            count = r.getdel(key)  # Atomic get-and-delete

            if count:
                increment_click_count_in_db(short_code, int(count))

        if cursor == 0:
            break

# Run every 60 seconds
import threading
def start_flush_worker():
    while True:
        flush_click_counts()
        time.sleep(60)

threading.Thread(target=start_flush_worker, daemon=True).start()
```

## URL Expiration

```python
def shorten_url_with_expiry(long_url: str, ttl_seconds: int) -> str:
    short_code = generate_short_code()
    save_to_db(short_code, long_url, expires_in=ttl_seconds)

    # Set TTL in Redis to match expiry
    r.setex(f"url:short:{short_code}", ttl_seconds, long_url)

    return short_code
```

## Rate Limiting Per User

```javascript
async function rateLimitCheck(userId, maxPerHour = 1000) {
  const key = `url:user:${userId}:count`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 3600); // Set 1-hour window on first request
  }

  return count <= maxPerHour;
}
```

## Capacity Estimation

```text
Storage:
- 100M URLs * avg 200 bytes per record = 20GB in database
- Hot 10% cached in Redis = 2GB Redis memory

Traffic:
- 10K writes/sec -> Redis counter INCR handles easily
- 100K reads/sec -> Redis cache + multiple API servers

Short code space:
- 6-char base62 = 56 billion unique codes - sufficient for years
```

## Interview Discussion Points

```text
Q: Why Redis for the redirect cache?
A: Redirects are latency-sensitive. Redis provides sub-ms lookup.

Q: What happens if Redis goes down?
A: Fall through to the database. Cache rebuilds on demand.

Q: How do you prevent duplicate short codes for the same URL?
A: Hash the long URL and check Redis/DB before creating new entry.

Q: How do you handle custom short codes?
A: Allow user-provided codes, check for uniqueness before saving.
```

## Summary

A URL shortener uses Redis primarily as a read cache for the short-to-long URL mapping and as an atomic counter for ID generation. The database remains the source of truth. Redis absorbs 90%+ of redirect traffic through caching, while INCR provides collision-free sequential IDs for base62 encoding. Click count buffering in Redis reduces write load on the primary database.
