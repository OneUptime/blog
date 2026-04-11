# How to Build a Content-Addressed Cache with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Hashing

Description: Build a content-addressed Redis cache where keys are derived from content hashes, enabling automatic deduplication and immutable caching.

---

A content-addressed cache uses the hash of the data itself as the cache key. Two identical pieces of content always produce the same hash, so they map to the same cache entry automatically. This pattern is used in build systems, asset pipelines, and API response caches to eliminate redundant storage and enable immutable cache entries with very long TTLs.

## How It Works

```text
content -> SHA256(content) -> cache key
"hello"  -> 2cf24dba...    -> "cache:2cf24dba..."
"hello"  -> 2cf24dba...    -> same key, same cached entry
```

Because the key is derived from the content, the cached value can never be "stale" - if the content changes, the hash changes and a new key is used.

## Implementation in Python

```python
import redis
import hashlib
import json

r = redis.Redis(host='localhost', port=6379)

def content_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def cache_content(data: bytes, ttl: int = 86400) -> str:
    key = f"cas:{content_hash(data)}"
    if not r.exists(key):
        r.setex(key, ttl, data)
    return key

def get_content(content_key: str) -> bytes | None:
    return r.get(content_key)
```

## Caching API Responses by Content Hash

```python
import requests

def fetch_and_cache(url: str) -> dict:
    response = requests.get(url)
    body = response.content

    # Derive key from content, not URL
    key = cache_content(body, ttl=3600)

    # Store a URL -> content key mapping for lookups
    r.setex(f"url:{url}", 3600, key)

    return {"key": key, "data": json.loads(body)}

def get_cached_response(url: str) -> dict | None:
    content_key = r.get(f"url:{url}")
    if not content_key:
        return None
    data = get_content(content_key)
    return json.loads(data) if data else None
```

## Deduplication for File Assets

```python
def cache_file(filepath: str) -> str:
    with open(filepath, 'rb') as f:
        data = f.read()

    key = f"file:{content_hash(data)}"

    if not r.exists(key):
        # Store the file contents in Redis (suitable for small files)
        r.set(key, data)
        print(f"Stored new file under key: {key}")
    else:
        print(f"Duplicate detected, reusing key: {key}")

    return key
```

## Immutable Cache TTL Strategy

Since content-addressed keys are immutable, you can use a very long TTL:

```bash
# Set a 7-day TTL for immutable content entries
SET "cas:2cf24dba..." "..." EX 604800

# Or use no TTL for permanent storage (be mindful of memory)
SET "cas:2cf24dba..." "..."
```

## Garbage Collection for Unreferenced Keys

Track which keys are referenced to enable cleanup:

```python
def add_reference(content_key: str, ref_name: str):
    r.sadd(f"refs:{content_key}", ref_name)

def remove_reference(content_key: str, ref_name: str):
    r.srem(f"refs:{content_key}", ref_name)
    if r.scard(f"refs:{content_key}") == 0:
        r.delete(content_key)
        r.delete(f"refs:{content_key}")
```

## Summary

A content-addressed Redis cache uses SHA-256 hashes of the data as keys, enabling automatic deduplication, immutable entries, and very long TTLs. The pattern is ideal for assets, build artifacts, and API responses where content identity matters more than location. When content changes, a new key is generated automatically - no manual invalidation needed.
