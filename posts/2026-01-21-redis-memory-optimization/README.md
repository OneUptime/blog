# How to Optimize Redis Memory Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Optimization, Performance, Data Structures, Compression, Eviction, Production

Description: A comprehensive guide to optimizing Redis memory usage. Learn memory policies, data structure optimization, encoding configurations, and compression techniques to maximize efficiency.

---

> Redis stores all data in memory, making memory optimization critical for both cost and performance. Understanding how Redis uses memory and optimizing data structures can reduce memory consumption by 50% or more while maintaining performance.

This guide covers memory analysis, data structure optimization, configuration tuning, and practical techniques for reducing Redis memory footprint.

---

## Understanding Redis Memory Usage

### Memory Breakdown

```bash
# Get memory statistics
redis-cli INFO memory

# Key metrics:
# used_memory: Total allocated memory
# used_memory_rss: Memory from OS perspective (includes fragmentation)
# used_memory_overhead: Memory for internal structures
# used_memory_dataset: Memory for actual data
# mem_fragmentation_ratio: RSS / used_memory (ideally close to 1.0)
```

### Memory Analysis

```bash
# Detailed memory report
redis-cli MEMORY DOCTOR

# Memory usage of specific key
redis-cli MEMORY USAGE mykey

# Sample keys to find memory hogs
redis-cli --memkeys

# Memory breakdown by key pattern
redis-cli --bigkeys
```

### Python Memory Analysis Tool

```python
import redis
from collections import defaultdict
import re

def analyze_memory(host, password, sample_size=10000):
    """Analyze Redis memory usage by key pattern"""
    r = redis.Redis(host=host, password=password)

    patterns = defaultdict(lambda: {'count': 0, 'memory': 0})

    cursor = 0
    sampled = 0

    while sampled < sample_size:
        cursor, keys = r.scan(cursor, count=100)

        for key in keys:
            if sampled >= sample_size:
                break

            # Get memory usage
            try:
                memory = r.memory_usage(key)
            except:
                continue

            # Extract pattern (replace IDs with placeholder)
            pattern = re.sub(r'\d+', '{id}', key.decode())
            pattern = re.sub(r'[a-f0-9-]{36}', '{uuid}', pattern)

            patterns[pattern]['count'] += 1
            patterns[pattern]['memory'] += memory or 0

            sampled += 1

        if cursor == 0:
            break

    # Sort by memory usage
    sorted_patterns = sorted(
        patterns.items(),
        key=lambda x: x[1]['memory'],
        reverse=True
    )

    print(f"{'Pattern':<50} {'Count':>10} {'Memory':>15} {'Avg':>10}")
    print("-" * 90)

    for pattern, stats in sorted_patterns[:20]:
        avg = stats['memory'] // stats['count'] if stats['count'] > 0 else 0
        print(f"{pattern:<50} {stats['count']:>10} {stats['memory']:>15} {avg:>10}")

    return sorted_patterns

# Usage
analyze_memory('localhost', 'password')
```

---

## Data Structure Optimization

### Encoding Types

Redis uses different encodings based on data size:

```bash
# Check encoding of a key
redis-cli OBJECT ENCODING mykey

# Encodings:
# - int: Integer as string
# - embstr: Short string (< 44 bytes)
# - raw: Long string
# - ziplist: Small lists/hashes/sorted sets
# - listpack: Replacement for ziplist (Redis 7+)
# - hashtable: Large hashes
# - skiplist: Large sorted sets
# - intset: Small sets of integers
```

### Configure Encoding Thresholds

```bash
# redis.conf - Optimize for memory

# Hashes: Use ziplist for small hashes
hash-max-ziplist-entries 512    # Max entries before hashtable
hash-max-ziplist-value 64       # Max value size in ziplist

# Lists: Use listpack for small lists (Redis 7+)
list-max-listpack-size -2       # -2 = 8kb per node
list-compress-depth 1           # Compress all but head/tail

# Sets: Use intset for integer sets
set-max-intset-entries 512      # Max entries for intset
set-max-listpack-entries 128    # For non-integer small sets

# Sorted Sets: Use ziplist for small sorted sets
zset-max-ziplist-entries 128    # Max entries before skiplist
zset-max-ziplist-value 64       # Max value size
```

### String Optimization

```python
import redis
import json
import msgpack

r = redis.Redis(host='localhost', password='password')

# Bad: Storing large JSON strings
user_data = {"name": "John", "email": "john@example.com", "age": 30}
r.set("user:1000", json.dumps(user_data))  # ~70 bytes

# Better: Use hash for structured data
r.hset("user:1000", mapping=user_data)  # Uses ziplist encoding

# Best for many small objects: Pack into single hash
# Store multiple users in one hash
for user_id in range(1000):
    r.hset("users", str(user_id), json.dumps({"name": f"User {user_id}"}))
# More efficient than 1000 separate keys

# Use MessagePack instead of JSON (smaller)
r.set("user:1000:msgpack", msgpack.packb(user_data))  # ~40 bytes
```

### Hash Optimization

```python
# Storing many small objects efficiently

# Bad: One key per object (high overhead)
for i in range(100000):
    r.set(f"object:{i}", f"value-{i}")
# Each key has ~50+ bytes overhead

# Good: Pack into hashes (ziplist encoding)
# Group objects into buckets
def get_bucket(object_id, bucket_size=1000):
    return object_id // bucket_size

for i in range(100000):
    bucket = get_bucket(i)
    r.hset(f"objects:{bucket}", str(i), f"value-{i}")
# Uses ziplist encoding, much lower overhead

# Check memory savings
print(f"Individual keys: estimate high overhead")
print(f"Bucketed hashes: estimate 50-70% less memory")
```

### Integer Encoding

```python
# Redis stores integers efficiently

# Integers as strings use special encoding
r.set("counter", "12345")  # Stored as int, not string

# Range: -2^63 to 2^63-1

# Verify encoding
encoding = r.object("encoding", "counter")
print(f"Encoding: {encoding}")  # Should be 'int'
```

---

## Memory Policies and Eviction

### Configure maxmemory

```bash
# redis.conf
maxmemory 4gb

# Or dynamically
redis-cli CONFIG SET maxmemory 4gb
```

### Eviction Policies

```bash
# redis.conf
maxmemory-policy allkeys-lru  # Recommended for cache

# Policies:
# noeviction       - Return error when memory limit reached
# allkeys-lru      - Evict least recently used keys
# allkeys-lfu      - Evict least frequently used keys
# volatile-lru     - Evict LRU keys with TTL
# volatile-lfu     - Evict LFU keys with TTL
# volatile-ttl     - Evict keys with shortest TTL
# allkeys-random   - Random eviction
# volatile-random  - Random eviction of keys with TTL

# For caching: allkeys-lru or allkeys-lfu
# For data store: noeviction (handle at application level)
```

### LFU Tuning

```bash
# LFU parameters
lfu-log-factor 10    # How slowly counter decays (higher = slower)
lfu-decay-time 1     # Minutes between counter decay

# Higher lfu-log-factor = more accurate frequency tracking
# but slower to adapt to changing access patterns
```

---

## TTL and Expiration

### Efficient TTL Usage

```python
# Set TTL at creation time
r.setex("cache:item", 3600, "value")  # Expires in 1 hour

# Add TTL to existing key
r.expire("mykey", 3600)

# Use absolute expiration
import time
expire_at = int(time.time()) + 3600
r.expireat("mykey", expire_at)

# Check TTL
ttl = r.ttl("mykey")  # Seconds remaining
pttl = r.pttl("mykey")  # Milliseconds remaining
```

### Expiration Strategies

```bash
# Redis expiration modes:
# 1. Lazy expiration: Check on access
# 2. Active expiration: Background sampling

# Configure active expiration
# redis.conf
hz 10                        # Check 10 times per second
active-expire-effort 1       # 1 (low) to 10 (aggressive)

# For memory-constrained systems:
active-expire-effort 5       # More aggressive cleanup
```

### Avoid Expiration Thundering Herd

```python
import random

def set_with_jitter(r, key, value, base_ttl):
    """Add jitter to TTL to prevent mass expiration"""
    # Add 0-10% jitter
    jitter = random.uniform(0, 0.1)
    ttl = int(base_ttl * (1 + jitter))
    r.setex(key, ttl, value)

# All keys expire around same time - bad
for i in range(1000):
    r.setex(f"key:{i}", 3600, f"value:{i}")

# With jitter - better distribution
for i in range(1000):
    set_with_jitter(r, f"key:{i}", f"value:{i}", 3600)
```

---

## Compression Techniques

### Application-Level Compression

```python
import redis
import zlib
import lz4.frame
import json

r = redis.Redis(host='localhost', password='password')

class CompressedRedis:
    """Redis wrapper with transparent compression"""

    def __init__(self, redis_client, threshold=1024, algorithm='lz4'):
        self.r = redis_client
        self.threshold = threshold  # Compress if larger than this
        self.algorithm = algorithm

    def _compress(self, data: bytes) -> bytes:
        if self.algorithm == 'zlib':
            return b'Z' + zlib.compress(data, level=6)
        elif self.algorithm == 'lz4':
            return b'L' + lz4.frame.compress(data)
        return data

    def _decompress(self, data: bytes) -> bytes:
        if not data:
            return data
        if data[0:1] == b'Z':
            return zlib.decompress(data[1:])
        elif data[0:1] == b'L':
            return lz4.frame.decompress(data[1:])
        return data

    def set(self, key, value, **kwargs):
        data = value if isinstance(value, bytes) else value.encode()

        if len(data) >= self.threshold:
            data = self._compress(data)

        return self.r.set(key, data, **kwargs)

    def get(self, key):
        data = self.r.get(key)
        if data:
            return self._decompress(data)
        return data

# Usage
cr = CompressedRedis(r, threshold=512, algorithm='lz4')

# Large JSON data
large_data = json.dumps({"data": "x" * 10000})
cr.set("large:key", large_data)

# Check compression ratio
original_size = len(large_data)
stored_size = r.memory_usage("large:key")
print(f"Original: {original_size}, Stored: {stored_size}")
print(f"Compression ratio: {original_size / stored_size:.2f}x")
```

### Choosing Compression Algorithm

```python
import zlib
import lz4.frame
import time

def benchmark_compression(data):
    """Compare compression algorithms"""
    results = {}

    # zlib (good compression, slower)
    start = time.time()
    compressed = zlib.compress(data, level=6)
    compress_time = time.time() - start

    start = time.time()
    zlib.decompress(compressed)
    decompress_time = time.time() - start

    results['zlib'] = {
        'size': len(compressed),
        'ratio': len(data) / len(compressed),
        'compress_time': compress_time,
        'decompress_time': decompress_time
    }

    # lz4 (fast, moderate compression)
    start = time.time()
    compressed = lz4.frame.compress(data)
    compress_time = time.time() - start

    start = time.time()
    lz4.frame.decompress(compressed)
    decompress_time = time.time() - start

    results['lz4'] = {
        'size': len(compressed),
        'ratio': len(data) / len(compressed),
        'compress_time': compress_time,
        'decompress_time': decompress_time
    }

    return results

# Test
data = b"x" * 100000
results = benchmark_compression(data)
for algo, stats in results.items():
    print(f"{algo}: ratio={stats['ratio']:.2f}x, "
          f"compress={stats['compress_time']*1000:.2f}ms, "
          f"decompress={stats['decompress_time']*1000:.2f}ms")
```

---

## Memory Fragmentation

### Understanding Fragmentation

```bash
# Check fragmentation ratio
redis-cli INFO memory | grep fragmentation

# mem_fragmentation_ratio interpretation:
# < 1.0: Redis is swapping (very bad)
# 1.0 - 1.5: Normal
# > 1.5: High fragmentation (wasted memory)
# > 2.0: Very high fragmentation (consider defrag)
```

### Active Defragmentation

```bash
# Enable active defragmentation (Redis 4.0+)
# redis.conf
activedefrag yes
active-defrag-ignore-bytes 100mb    # Don't defrag if less than this
active-defrag-threshold-lower 10    # Start if frag > 10%
active-defrag-threshold-upper 100   # Maximum effort if frag > 100%
active-defrag-cycle-min 1           # Min CPU % for defrag
active-defrag-cycle-max 25          # Max CPU % for defrag

# Or enable dynamically
redis-cli CONFIG SET activedefrag yes
```

### Allocator Choice

```bash
# Redis supports different memory allocators
# jemalloc (default): Best for most workloads
# libc: Standard malloc
# tcmalloc: Google's allocator

# Check current allocator
redis-cli INFO memory | grep allocator

# Compile with different allocator
make MALLOC=jemalloc
```

---

## Monitoring Memory

### Prometheus Metrics

```python
from prometheus_client import Gauge, start_http_server
import redis
import time

# Metrics
redis_memory_used = Gauge('redis_memory_used_bytes', 'Redis used memory')
redis_memory_rss = Gauge('redis_memory_rss_bytes', 'Redis RSS memory')
redis_memory_peak = Gauge('redis_memory_peak_bytes', 'Redis peak memory')
redis_fragmentation = Gauge('redis_memory_fragmentation_ratio', 'Memory fragmentation')
redis_keys = Gauge('redis_keys_total', 'Total keys')

def monitor_memory(host, password):
    r = redis.Redis(host=host, password=password)

    while True:
        try:
            info = r.info('memory')

            redis_memory_used.set(info['used_memory'])
            redis_memory_rss.set(info['used_memory_rss'])
            redis_memory_peak.set(info['used_memory_peak'])
            redis_fragmentation.set(info['mem_fragmentation_ratio'])

            # Count keys
            keys_info = r.info('keyspace')
            total_keys = sum(
                int(v.split(',')[0].split('=')[1])
                for v in keys_info.values()
            )
            redis_keys.set(total_keys)

        except Exception as e:
            print(f"Error: {e}")

        time.sleep(15)

if __name__ == '__main__':
    start_http_server(8000)
    monitor_memory('localhost', 'password')
```

---

## Best Practices

### 1. Right-Size Data Structures

```python
# Use smallest appropriate data structure

# For flags: Use bitmaps instead of many keys
r.setbit("user:active", user_id, 1)  # 1 bit per user

# For counters: Use hash fields
r.hincrby("stats", "page_views", 1)  # vs separate keys

# For small objects: Pack into hashes
r.hset("users:bucket:0", "1000", json.dumps(user_data))
```

### 2. Set TTLs on Everything

```python
# Always set TTL for cache data
r.setex("cache:item", 3600, value)

# Check for keys without TTL
def find_keys_without_ttl(r, pattern="*", sample_size=1000):
    cursor = 0
    no_ttl = []

    while len(no_ttl) < sample_size:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        for key in keys:
            if r.ttl(key) == -1:  # No TTL
                no_ttl.append(key)
        if cursor == 0:
            break

    return no_ttl
```

### 3. Monitor and Alert

```yaml
# Prometheus alerting rules
groups:
  - name: redis-memory
    rules:
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage > 90%"

      - alert: RedisFragmentationHigh
        expr: redis_memory_fragmentation_ratio > 1.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory fragmentation high"
```

---

## Conclusion

Optimizing Redis memory requires:

- **Understanding encoding**: Use appropriate data structures
- **Configuration tuning**: Set encoding thresholds and eviction policies
- **Compression**: For large values, compress before storing
- **Monitoring**: Track memory usage and fragmentation

Key takeaways:
- Pack small objects into hashes for ziplist encoding
- Always set TTLs on cache data
- Monitor fragmentation and enable active defrag
- Choose appropriate eviction policy for your use case

---

*Need to monitor your Redis memory usage? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with memory alerts, fragmentation tracking, and key size analysis.*
