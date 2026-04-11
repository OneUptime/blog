# How to Compress Data Before Storing in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Compression, Memory Optimization, Node.js, Python, Performance

Description: Reduce Redis memory usage and network bandwidth by compressing values before storing them, with examples in Node.js and Python using gzip and snappy.

---

## Why Compress Data in Redis?

Redis stores everything in memory, which makes it fast but expensive. Large JSON objects, serialized data, or text blobs can quickly consume gigabytes of RAM. Compressing values before storing can reduce memory footprint by 50-90% for text-heavy payloads.

Benefits of compression:
- Lower memory usage and cost
- Faster network transfers between app and Redis
- More data fits in available RAM before eviction kicks in

The trade-off is CPU overhead for compress/decompress on every read and write.

## Choosing a Compression Algorithm

| Algorithm | Speed | Ratio | Best For |
|-----------|-------|-------|----------|
| gzip | Medium | High | General text/JSON |
| snappy | Fast | Medium | High-throughput caching |
| lz4 | Very fast | Medium | Latency-sensitive apps |
| zstd | Fast | Very high | Large structured data |

## Compressing with Node.js

### Using zlib (gzip)

```javascript
const Redis = require('ioredis');
const zlib = require('zlib');
const { promisify } = require('util');

const redis = new Redis();
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

async function setCompressed(key, value, ttlSeconds = 3600) {
  const json = JSON.stringify(value);
  const compressed = await gzip(Buffer.from(json, 'utf8'));
  await redis.setex(key, ttlSeconds, compressed);
}

async function getCompressed(key) {
  const compressed = await redis.getBuffer(key);
  if (!compressed) return null;
  const decompressed = await gunzip(compressed);
  return JSON.parse(decompressed.toString('utf8'));
}

// Usage
await setCompressed('user:1001', { id: 1001, name: 'Alice', profile: '...' });
const user = await getCompressed('user:1001');
```

### Using snappy for higher throughput

```javascript
const snappy = require('snappy');
const redis = new Redis();

async function setSnappy(key, value, ttl = 3600) {
  const json = JSON.stringify(value);
  const compressed = await snappy.compress(json);
  await redis.setex(key, ttl, compressed);
}

async function getSnappy(key) {
  const buf = await redis.getBuffer(key);
  if (!buf) return null;
  const decompressed = await snappy.uncompress(buf, { asBuffer: false });
  return JSON.parse(decompressed);
}
```

## Compressing with Python

### Using gzip

```python
import gzip
import json
import redis

client = redis.Redis(host='localhost', port=6379)

def set_compressed(key: str, value: dict, ttl: int = 3600):
    json_bytes = json.dumps(value).encode('utf-8')
    compressed = gzip.compress(json_bytes, compresslevel=6)
    client.setex(key, ttl, compressed)

def get_compressed(key: str):
    compressed = client.get(key)
    if not compressed:
        return None
    json_bytes = gzip.decompress(compressed)
    return json.loads(json_bytes.decode('utf-8'))

# Usage
data = {"user_id": 1001, "events": list(range(1000)), "metadata": "..."}
set_compressed("user:1001:events", data)
result = get_compressed("user:1001:events")
```

### Using lz4 for speed

```python
import lz4.frame
import json
import redis

client = redis.Redis(host='localhost', port=6379)

def set_lz4(key: str, value: dict, ttl: int = 3600):
    serialized = json.dumps(value).encode('utf-8')
    compressed = lz4.frame.compress(serialized)
    client.setex(key, ttl, compressed)

def get_lz4(key: str):
    data = client.get(key)
    if data is None:
        return None
    decompressed = lz4.frame.decompress(data)
    return json.loads(decompressed.decode('utf-8'))
```

## Measuring Compression Savings

```python
import gzip
import json

sample = {"user_id": 1, "events": [{"type": "click", "ts": 1700000000 + i} for i in range(100)]}
raw = json.dumps(sample).encode('utf-8')
compressed = gzip.compress(raw)

print(f"Original:   {len(raw):,} bytes")
print(f"Compressed: {len(compressed):,} bytes")
print(f"Ratio:      {len(raw) / len(compressed):.1f}x reduction")
```

Sample output:

```text
Original:   3,726 bytes
Compressed:   312 bytes
Ratio:      11.9x reduction
```

## Best Practices

- Only compress values above a size threshold (e.g., 1 KB) - small values see little benefit and add CPU cost
- Store a prefix or flag in the key name to indicate compressed values: `user:1001:gz`
- Use binary-safe Redis commands (`getBuffer`/`setex` with Buffer) to avoid encoding corruption
- Test compression ratio on real production data before committing to an algorithm

## Summary

Compressing data before storing in Redis is a straightforward optimization that can dramatically reduce memory consumption and network overhead. Choose gzip for the best compression ratio on JSON, snappy or lz4 for high-throughput scenarios, and always measure actual savings on your data before choosing an algorithm. Apply compression selectively for values above a minimum size threshold to avoid unnecessary CPU overhead.
