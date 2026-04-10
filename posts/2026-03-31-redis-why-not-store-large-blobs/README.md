# Why You Should Not Store Large Blobs in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Anti-Pattern

Description: Understand why storing large binary objects in Redis wastes memory, hurts replication, and causes latency spikes - and what to store instead.

---

Redis excels at storing small, frequently accessed values. Stuffing large blobs - images, PDFs, serialized ML models, video files - into Redis is one of the most common anti-patterns and causes serious operational problems.

## What Counts as "Large"

There is no hard cutoff, but practical thresholds are:

```text
Fine:    < 10 KB  (session data, config, counters, small JSON)
Caution: 10 KB - 1 MB (large serialized objects, thumbnails)
Avoid:   > 1 MB  (images, documents, binary files)
Never:   > 10 MB (videos, large exports, ML model weights)
```

## Why Large Blobs Hurt Redis

**Memory amplification.** Redis stores keys in memory with overhead per entry. A single 50 MB blob consumes 50+ MB of your Redis instance's total RAM budget, displacing thousands of useful cache entries.

**Replication latency.** Redis replication is synchronous during the initial SYNC. A single large key delays the replica from catching up:

```bash
# A 100MB blob causes this in replica logs:
# Sending 104857600 bytes to replica 10.0.0.2:6379
# During this transfer, replica is behind and serving stale data
```

**Serialization latency.** Reading or writing a large value blocks the Redis event loop:

```bash
# Latency spike caused by reading a 10MB value
LATENCY HISTORY event
# timestamp: 1700000000, latency: 87 ms
```

**Memory fragmentation.** Storing and evicting large objects causes allocator fragmentation, wasting more memory over time.

## The Right Pattern: Store References, Not Blobs

Store large objects in object storage (S3, GCS, Azure Blob). Cache only the metadata and a signed URL:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cache_file_reference(file_id: str, metadata: dict, signed_url: str, ttl: int = 3600):
    """Store a tiny reference to a large file, not the file itself."""
    r.setex(f"file:ref:{file_id}", ttl, json.dumps({
        "name": metadata.get("name"),
        "size": metadata.get("size"),
        "content_type": metadata.get("content_type"),
        "url": signed_url,
        "expires_at": __import__("time").time() + ttl
    }))

def get_file_reference(file_id: str) -> dict | None:
    raw = r.get(f"file:ref:{file_id}")
    return json.loads(raw) if raw else None
```

## Compress Before Storing When You Must

If you truly need to cache moderately large values, compress them first:

```python
import zlib
import base64

def set_compressed(key: str, value: str, ttl: int = 3600):
    compressed = zlib.compress(value.encode(), level=6)
    r.setex(key, ttl, base64.b64encode(compressed))

def get_compressed(key: str) -> str | None:
    raw = r.get(key)
    if not raw:
        return None
    return zlib.decompress(base64.b64decode(raw)).decode()
```

## Size Check Before Writing

Add a guard in your caching layer:

```python
MAX_VALUE_SIZE_BYTES = 100 * 1024  # 100 KB

def safe_cache_set(key: str, value: str, ttl: int = 3600) -> bool:
    if len(value.encode()) > MAX_VALUE_SIZE_BYTES:
        # Log and skip - don't cache oversized values
        print(f"WARNING: Skipping cache for '{key}': value too large ({len(value.encode())} bytes)")
        return False
    r.setex(key, ttl, value)
    return True
```

## Detecting Existing Large Keys

Audit your keyspace for large values:

```bash
# Use redis-cli --bigkeys for a non-blocking scan
redis-cli --bigkeys

# Or use MEMORY USAGE to check a specific key's memory consumption
MEMORY USAGE my:large:key
# (integer) 5242880
```

## Summary

Large blobs in Redis waste expensive in-memory budget, delay replication, and cause latency spikes by blocking the event loop. The correct pattern is to store large objects in object storage and cache only their metadata and access URLs in Redis. When caching moderate-sized values is unavoidable, compress them and enforce a maximum size limit in your caching layer.
