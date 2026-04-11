# How to Use Redis Memory Optimization for Cost Reduction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Optimization, Cost Reduction, Performance, Cloud

Description: Reduce Redis memory usage and cloud costs by optimizing data structures, enabling compression, tuning encoding thresholds, and removing unnecessary data.

---

## Why Redis Memory Optimization Matters

Redis is an in-memory store, and memory is expensive - especially on managed services like AWS ElastiCache or Azure Cache for Redis. Reducing memory usage by 30-50% can translate directly to lower instance costs or the ability to store more data on the same instance.

## Step 1 - Measure Current Memory Usage

Before optimizing, understand your baseline:

```bash
redis-cli INFO memory
```

Key metrics:

```text
used_memory:104857600           # 100 MB logical memory
used_memory_rss:134217728       # 128 MB OS-allocated memory
used_memory_peak:209715200      # 200 MB peak
mem_fragmentation_ratio:1.28    # 28% fragmentation overhead
used_memory_lua:37888           # Lua script memory
```

Also use `MEMORY USAGE` on specific keys:

```bash
redis-cli MEMORY USAGE mykey
# (integer) 72  <- 72 bytes
```

And find the biggest memory consumers:

```bash
redis-cli --bigkeys
```

## Step 2 - Optimize Data Structure Encodings

Redis uses compact encodings for small data structures. Keeping collections below the size thresholds uses much less memory.

### Hash Encoding Thresholds

```text
# redis.conf - keep small hashes as ziplist/listpack
hash-max-listpack-entries 128  # Default: 128 (Redis 6.x), 512 (Redis 7.x)
hash-max-listpack-value 64     # Default: 64 bytes
```

When a hash has fewer entries than the configured threshold (128 in Redis 6.x, 512 in Redis 7.x by default) and each field value is under 64 bytes, Redis uses a compact listpack encoding that uses ~10x less memory than a hash table.

```bash
# Check encoding
redis-cli OBJECT ENCODING myhash
# "listpack" (compact) or "hashtable" (memory-intensive)
```

### List Encoding Thresholds

```text
# redis.conf
list-max-listpack-size -2       # Max 8KB per node (list-max-ziplist-size in Redis < 7.0)
```

### Sorted Set Encoding

```text
# redis.conf
zset-max-listpack-entries 128
zset-max-listpack-value 64
```

### Set Encoding

```text
# redis.conf
set-max-intset-entries 512      # Integer-only sets use intset (very compact)
set-max-listpack-entries 128
set-max-listpack-value 64
```

## Step 3 - Use Hashes for Object Storage Instead of Separate Keys

Storing many small objects as individual string keys wastes memory per-key overhead. Group related fields into a hash:

```python
# Inefficient - each key has overhead
redis.set('user:100:name', 'alice')
redis.set('user:100:email', 'alice@example.com')
redis.set('user:100:age', '30')

# Efficient - one hash with three fields
redis.hset('user:100', mapping={
    'name': 'alice',
    'email': 'alice@example.com',
    'age': '30'
})
```

Memory savings can be 50-80% for objects with many small fields.

## Step 4 - Compress Large Values

For large string values (JSON, serialized objects), compress before storing:

```python
import redis
import zlib
import json

r = redis.Redis()

def set_compressed(key, value, ex=None):
    serialized = json.dumps(value).encode('utf-8')
    compressed = zlib.compress(serialized, level=6)
    r.set(key, compressed, ex=ex)

def get_compressed(key):
    data = r.get(key)
    if data is None:
        return None
    return json.loads(zlib.decompress(data).decode('utf-8'))

# Large JSON object
data = {'users': [{'id': i, 'name': f'user{i}'} for i in range(1000)]}
set_compressed('large-object', data, ex=3600)
```

Compression ratios of 4:1 to 10:1 are common for JSON data.

## Step 5 - Set TTLs on All Non-Permanent Keys

Keys without TTLs accumulate indefinitely. Audit for keys missing TTLs:

```python
import redis

r = redis.Redis()

def audit_missing_ttls(pattern='*', sample_size=10000):
    no_ttl = 0
    total = 0
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=1000)
        for key in keys:
            total += 1
            if r.ttl(key) == -1:  # -1 means no expiry
                no_ttl += 1
                if total <= sample_size:
                    print(f"No TTL: {key.decode()}")
        if cursor == 0 or total >= sample_size:
            break
    if total > 0:
        print(f"Keys without TTL: {no_ttl}/{total} ({100*no_ttl/total:.1f}%)")
    else:
        print("No keys found matching the pattern.")

audit_missing_ttls('cache:*')
```

## Step 6 - Use Shorter Key Names

Every byte in a key name consumes memory. Use shorter prefixes for high-volume keys:

```text
# Long keys
user-session-data:abc123def456
shopping-cart-items:user:100

# Shorter keys (same meaning)
sess:abc123def456
cart:100
```

For 1 million keys, saving 20 bytes per key = 20 MB.

## Step 7 - Enable Active Defragmentation

Memory fragmentation wastes RSS memory. Enable jemalloc active defrag:

```bash
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-threshold-upper 100
```

Check fragmentation ratio:

```bash
redis-cli INFO memory | grep mem_fragmentation_ratio
```

If fragmentation ratio > 1.5, defrag can reclaim significant memory.

## Step 8 - Audit and Remove Stale Data

```python
import redis

r = redis.Redis()

def remove_idle_keys(pattern, max_idle_seconds=86400):
    """Remove keys idle for more than max_idle_seconds"""
    removed = 0
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=1000)
        for key in keys:
            idle = r.object("idletime", key)
            if idle and idle > max_idle_seconds:
                r.delete(key)
                removed += 1
        if cursor == 0:
            break
    return removed

removed = remove_idle_keys('cache:*', max_idle_seconds=7200)
print(f"Removed {removed} idle cache keys")
```

## Memory Savings Summary

| Optimization | Typical Savings |
|-------------|-----------------|
| Hash grouping (vs string keys) | 40-70% |
| Listpack encoding (keep collections small) | 30-60% |
| Compression for large values | 50-80% |
| TTL cleanup of expired data | Varies |
| Shorter key names | 5-15% |
| Active defragmentation | 10-30% of RSS |

## Summary

Reduce Redis memory costs by grouping small objects into hashes to leverage compact listpack encoding, compressing large JSON or binary values with zlib, setting TTLs on all temporary keys to prevent accumulation, and enabling active defragmentation to reduce memory fragmentation. Start by identifying the largest keys with `--bigkeys`, check encoding with `OBJECT ENCODING`, and measure impact after each optimization with `INFO memory`.
