# How to Reduce Redis Memory Usage with Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Optimization, Compression, Performance, Data Structure

Description: Learn practical techniques to reduce Redis memory usage through value compression, compact encodings, and efficient data structure choices.

---

## Why Compress Redis Data

Redis stores everything in memory, so memory efficiency directly affects your infrastructure costs and instance sizing. Even modest compression can cut memory usage by 50-80% for string-heavy workloads. Compression is particularly valuable for JSON blobs, serialized objects, and text-heavy values.

## Compression at the Application Layer

The most reliable approach is compressing values before writing them to Redis. Your application compresses data before SET and decompresses after GET.

Example in Python using zlib:

```python
import redis
import zlib
import json

r = redis.Redis(host='localhost', port=6379)

def set_compressed(key: str, data: dict, ttl: int = 3600):
    serialized = json.dumps(data).encode('utf-8')
    compressed = zlib.compress(serialized, level=6)
    r.set(key, compressed, ex=ttl)

def get_compressed(key: str) -> dict | None:
    raw = r.get(key)
    if raw is None:
        return None
    decompressed = zlib.decompress(raw)
    return json.loads(decompressed.decode('utf-8'))

# Usage
user_data = {"id": 1, "name": "Alice", "roles": ["admin", "editor"], "prefs": {}}
set_compressed("user:1", user_data)
result = get_compressed("user:1")
```

For Node.js using the built-in zlib module:

```javascript
const redis = require('redis');
const zlib = require('zlib');
const { promisify } = require('util');

const client = redis.createClient();
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

async function setCompressed(key, data, ttlSeconds = 3600) {
  const json = JSON.stringify(data);
  const compressed = await gzip(Buffer.from(json));
  await client.set(key, compressed, { EX: ttlSeconds });
}

async function getCompressed(key) {
  const raw = await client.getBuffer(key);
  if (!raw) return null;
  const decompressed = await gunzip(raw);
  return JSON.parse(decompressed.toString());
}
```

## Choosing the Right Compression Algorithm

Not all compression algorithms suit Redis workloads equally:

| Algorithm | Ratio | Speed | Best For |
|-----------|-------|-------|----------|
| zlib      | High  | Medium | General purpose |
| lz4       | Medium| Very Fast | Low-latency paths |
| zstd      | Very High | Fast | Large payloads |
| snappy    | Medium| Very Fast | High-throughput |

For latency-sensitive caches, prefer lz4 or snappy. For archival or session data where memory is the priority, use zstd.

Example with lz4 in Python:

```python
import lz4.frame
import json
import redis

r = redis.Redis(host='localhost', port=6379)

def set_lz4(key: str, data: dict, ttl: int = 3600):
    payload = json.dumps(data).encode()
    compressed = lz4.frame.compress(payload)
    r.set(key, compressed, ex=ttl)

def get_lz4(key: str) -> dict | None:
    raw = r.get(key)
    if not raw:
        return None
    return json.loads(lz4.frame.decompress(raw))
```

## Using Redis Hash Listpack Encoding

Redis automatically uses a compact listpack encoding for small hashes. This provides significant memory savings over full hash tables.

Configure the thresholds in redis.conf:

```text
hash-max-listpack-entries 128
hash-max-listpack-value 64
```

When a hash has fewer than 128 fields and all values are under 64 bytes, Redis uses the compact listpack encoding. A hash with 100 small fields might use 2-5x less memory than the same data stored as individual string keys.

```bash
# Check encoding of a hash
redis-cli OBJECT ENCODING myhash
# Returns: listpack (compact) or hashtable (full)
```

## Storing Compact Serialization Formats

JSON is verbose. Consider MessagePack or Protocol Buffers for smaller payloads:

```python
import msgpack
import redis

r = redis.Redis(host='localhost', port=6379)

data = {"user_id": 1234, "score": 9850, "level": 42}

# MessagePack is typically 20-30% smaller than JSON
packed = msgpack.packb(data, use_bin_type=True)
r.set("user:1234:stats", packed)

raw = r.get("user:1234:stats")
unpacked = msgpack.unpackb(raw, raw=False)
```

## Using Integer Encoding for Numeric Keys

Redis automatically encodes integers in a compact form. If your values are integers, avoid storing them as strings with padding:

```bash
# Efficient - Redis uses integer encoding
SET counter:page:home 12345

# Wasteful - stored as a full string
SET counter:page:home "00012345"
```

Check the encoding:

```bash
redis-cli OBJECT ENCODING counter:page:home
# Returns: int
```

## Compressing Large String Values Selectively

Not every key needs compression. Apply it selectively based on value size:

```python
COMPRESSION_THRESHOLD = 1024  # compress values larger than 1KB

def smart_set(r, key: str, value: str, ttl: int = 3600):
    encoded = value.encode('utf-8')
    if len(encoded) > COMPRESSION_THRESHOLD:
        payload = b'gz:' + zlib.compress(encoded)
    else:
        payload = b'raw:' + encoded
    r.set(key, payload, ex=ttl)

def smart_get(r, key: str) -> str | None:
    raw = r.get(key)
    if raw is None:
        return None
    if raw.startswith(b'gz:'):
        return zlib.decompress(raw[3:]).decode('utf-8')
    return raw[4:].decode('utf-8')
```

## Monitoring Memory Savings

Compare memory usage before and after:

```bash
redis-cli INFO memory | grep used_memory_human
redis-cli OBJECT ENCODING somekey
redis-cli OBJECT FREQ somekey
redis-cli OBJECT IDLETIME somekey
```

Use MEMORY USAGE to measure individual key costs:

```bash
redis-cli MEMORY USAGE user:1234
# Returns memory in bytes including overhead
```

## Summary

Reducing Redis memory usage through compression involves a combination of application-layer compression for large values, choosing efficient serialization formats like MessagePack, and leveraging Redis's built-in compact encodings for hashes, lists, and sets. Apply compression selectively based on value size and latency requirements, and use the MEMORY USAGE command to measure the impact of your optimizations on individual keys and overall instance memory.
