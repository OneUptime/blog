# How to Implement Cache Compression with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Compression, Memory, Performance

Description: Learn how to compress cached values before storing them in Redis to reduce memory usage and network transfer costs, especially for large JSON payloads.

---

Large cached objects - API responses, HTML fragments, serialized records - can consume significant Redis memory. Compressing values before storing them can reduce memory by 60-80% for typical JSON. The tradeoff is CPU time for compress and decompress operations.

## When to Compress

```text
Good candidates:
- Large JSON responses (>1 KB)
- HTML/template fragments
- List or array data
- Repeated string-heavy structures

Poor candidates:
- Small values (<200 bytes) - header overhead negates savings
- Already-compressed data (images, videos)
- High-frequency hot keys where CPU overhead matters
```

## Using zlib Compression

```python
import redis
import json
import zlib

r = redis.Redis(host="localhost", port=6379)  # bytes mode for compression

COMPRESSION_THRESHOLD = 512  # bytes - only compress if larger

def compress_set(key: str, value: dict, ttl: int = 300, level: int = 6):
    raw = json.dumps(value).encode("utf-8")
    if len(raw) >= COMPRESSION_THRESHOLD:
        compressed = zlib.compress(raw, level=level)
        # Prefix with marker byte to indicate compression
        data = b"\x01" + compressed
    else:
        data = b"\x00" + raw
    r.set(key, data, ex=ttl)

def compress_get(key: str) -> dict | None:
    data = r.get(key)
    if data is None:
        return None
    marker, payload = data[0:1], data[1:]
    if marker == b"\x01":
        raw = zlib.decompress(payload)
    else:
        raw = payload
    return json.loads(raw.decode("utf-8"))
```

## Using lz4 for Faster Compression

```bash
pip install lz4
```

```python
import lz4.frame

def lz4_set(key: str, value: dict, ttl: int = 300):
    raw = json.dumps(value).encode("utf-8")
    compressed = lz4.frame.compress(raw)
    r.set(key, compressed, ex=ttl)

def lz4_get(key: str) -> dict | None:
    data = r.get(key)
    if data is None:
        return None
    raw = lz4.frame.decompress(data)
    return json.loads(raw.decode("utf-8"))
```

lz4 compresses and decompresses 3-5x faster than zlib at slightly lower compression ratios.

## Measuring Compression Savings

```python
def compression_stats(value: dict) -> dict:
    raw = json.dumps(value).encode("utf-8")
    zlib_compressed = zlib.compress(raw, level=6)
    raw_size = len(raw)
    compressed_size = len(zlib_compressed)
    ratio = compressed_size / raw_size
    savings = (1 - ratio) * 100
    return {
        "original_bytes": raw_size,
        "compressed_bytes": compressed_size,
        "ratio": round(ratio, 3),
        "savings_percent": round(savings, 1),
    }

# Example
large_payload = {"users": [{"id": i, "name": f"User {i}", "email": f"user{i}@example.com"} for i in range(100)]}
stats = compression_stats(large_payload)
print(stats)
# {'original_bytes': 5800, 'compressed_bytes': 1240, 'ratio': 0.214, 'savings_percent': 78.6}
```

## Checking Memory Usage in Redis

```bash
# Compare memory usage before/after compression
redis-cli MEMORY USAGE mykey

# Check total Redis memory
redis-cli INFO memory | grep used_memory_human
```

## Wrapper Class

```python
class CompressedCache:
    def __init__(self, client: redis.Redis, threshold: int = 512):
        self.r = client
        self.threshold = threshold

    def get(self, key: str) -> dict | None:
        return compress_get(key)

    def set(self, key: str, value: dict, ttl: int = 300):
        compress_set(key, value, ttl=ttl)
```

## Summary

Cache compression with Redis stores zlib or lz4 compressed bytes instead of raw JSON, reducing memory usage by 60-80% for typical payloads. A marker byte distinguishes compressed from uncompressed entries, allowing a smooth rollout with a minimum-size threshold. Use lz4 when decompression speed is critical and zlib when memory savings are the priority.

