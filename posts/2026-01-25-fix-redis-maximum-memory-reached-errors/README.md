# How to Fix 'Redis maximum memory reached' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Troubleshooting, Eviction, Performance

Description: Learn how to handle Redis maximum memory errors, configure eviction policies, optimize memory usage, and implement strategies for managing memory-constrained Redis deployments.

---

When Redis hits its memory limit, you will see "OOM command not allowed" errors. Unlike the generic "out of memory" error (which relates to system memory), this error means Redis has reached its configured maxmemory limit. Understanding how Redis handles this situation is key to resolving it.

## Understanding maxmemory

Redis can be configured with a memory limit:

```bash
# Check current settings
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy

# Typical output:
# "maxmemory" "4294967296"  (4GB in bytes)
# "maxmemory-policy" "noeviction"
```

When maxmemory is reached, Redis behavior depends on the eviction policy:

| Policy | Behavior |
|--------|----------|
| noeviction | Return errors on writes (default) |
| allkeys-lru | Evict least recently used keys |
| allkeys-lfu | Evict least frequently used keys |
| volatile-lru | Evict LRU keys with TTL set |
| volatile-lfu | Evict LFU keys with TTL set |
| allkeys-random | Evict random keys |
| volatile-random | Evict random keys with TTL |
| volatile-ttl | Evict keys with shortest TTL |

## Quick Diagnosis

```bash
# Check current memory usage
redis-cli INFO memory

# Key metrics:
# used_memory_human:3.98G
# maxmemory_human:4.00G
# maxmemory_policy:noeviction
# evicted_keys:0

# Check what is using memory
redis-cli MEMORY DOCTOR

# Find biggest keys
redis-cli --bigkeys
```

## Immediate Solutions

### 1. Increase maxmemory

```bash
# Increase limit (if system has available RAM)
redis-cli CONFIG SET maxmemory 8gb

# Make permanent
redis-cli CONFIG REWRITE
```

### 2. Enable Eviction

```bash
# Switch to LRU eviction
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Or for cache with TTL
redis-cli CONFIG SET maxmemory-policy volatile-lru
```

### 3. Manually Free Memory

```bash
# Delete specific keys
redis-cli DEL large_key_1 large_key_2

# Delete keys matching pattern (careful!)
redis-cli --scan --pattern "cache:old:*" | xargs redis-cli DEL

# Flush a database (data loss!)
redis-cli FLUSHDB

# Flush all (extreme - data loss!)
redis-cli FLUSHALL
```

## Choosing the Right Eviction Policy

### For Pure Cache (all data can be regenerated)

```bash
# LRU - good general-purpose choice
CONFIG SET maxmemory-policy allkeys-lru

# LFU - better if some items are accessed frequently
CONFIG SET maxmemory-policy allkeys-lfu
```

### For Mixed Workload (some data must persist)

```bash
# Only evict keys with TTL set
CONFIG SET maxmemory-policy volatile-lru

# Important: Ensure cache keys have TTL, persistent data does not
```

### For Session Storage

```bash
# Evict sessions with shortest TTL first
CONFIG SET maxmemory-policy volatile-ttl
```

## Memory Optimization Strategies

### 1. Use Efficient Data Structures

```python
import redis
import json

r = redis.Redis()

# Inefficient: Store as JSON string
user_data = {"name": "Alice", "email": "alice@example.com", "age": 30}
r.set("user:123:json", json.dumps(user_data))

# More efficient: Use hash
r.hset("user:123", mapping=user_data)

# Compare memory usage
print(f"JSON string: {r.memory_usage('user:123:json')} bytes")
print(f"Hash: {r.memory_usage('user:123')} bytes")
```

### 2. Enable Compression for Large Values

```python
import zlib

class CompressedCache:
    def __init__(self, redis_client, threshold=1024):
        self.r = redis_client
        self.threshold = threshold

    def set(self, key, value, ex=None):
        data = json.dumps(value).encode()
        if len(data) > self.threshold:
            compressed = zlib.compress(data, level=6)
            self.r.set(f"z:{key}", compressed, ex=ex)
        else:
            self.r.set(key, data, ex=ex)

    def get(self, key):
        # Try compressed first
        data = self.r.get(f"z:{key}")
        if data:
            return json.loads(zlib.decompress(data))
        # Try uncompressed
        data = self.r.get(key)
        if data:
            return json.loads(data)
        return None
```

### 3. Shorter Key Names

```python
# Long keys waste memory at scale
r.set("application:users:profiles:user_id:12345:settings", value)

# Shorter keys save memory
r.set("u:12345:s", value)

# With millions of keys, this adds up significantly
```

### 4. Use Integer IDs Instead of UUIDs

```python
# UUID as key (36 bytes)
r.set("session:550e8400-e29b-41d4-a716-446655440000", data)

# Integer ID (much smaller)
r.set("s:12345678", data)
```

### 5. Configure Memory-Efficient Encodings

```bash
# Small hashes use ziplist encoding
CONFIG SET hash-max-listpack-entries 512
CONFIG SET hash-max-listpack-value 64

# Small lists use listpack
CONFIG SET list-max-listpack-size -2

# Small sets use intset for integers
CONFIG SET set-max-intset-entries 512
```

## Monitoring Memory Usage

```python
import redis
import time

class MemoryMonitor:
    def __init__(self, redis_client, warning_pct=75, critical_pct=90):
        self.r = redis_client
        self.warning_pct = warning_pct
        self.critical_pct = critical_pct

    def get_memory_stats(self):
        info = self.r.info('memory')
        stats_info = self.r.info('stats')

        used = info['used_memory']
        max_mem = info.get('maxmemory', 0)

        return {
            'used_mb': used / 1024 / 1024,
            'max_mb': max_mem / 1024 / 1024 if max_mem else None,
            'usage_pct': (used / max_mem * 100) if max_mem else None,
            'fragmentation': info['mem_fragmentation_ratio'],
            'evicted_keys': stats_info['evicted_keys'],
        }

    def check_health(self):
        stats = self.get_memory_stats()
        alerts = []

        if stats['usage_pct']:
            if stats['usage_pct'] >= self.critical_pct:
                alerts.append(('CRITICAL', f"Memory at {stats['usage_pct']:.1f}%"))
            elif stats['usage_pct'] >= self.warning_pct:
                alerts.append(('WARNING', f"Memory at {stats['usage_pct']:.1f}%"))

        if stats['fragmentation'] > 1.5:
            alerts.append(('WARNING', f"High fragmentation: {stats['fragmentation']:.2f}"))

        return stats, alerts

    def run(self, interval=60):
        while True:
            stats, alerts = self.check_health()
            print(f"Memory: {stats['used_mb']:.1f}MB / {stats['max_mb']:.1f}MB "
                  f"({stats['usage_pct']:.1f}%)")

            for level, msg in alerts:
                print(f"  {level}: {msg}")

            time.sleep(interval)

# Usage
monitor = MemoryMonitor(r)
monitor.run()
```

## Analyzing Memory Usage

### Find Memory Hogs

```python
def analyze_memory_by_pattern(redis_client, patterns, sample_size=10000):
    """Analyze memory usage by key patterns."""
    from collections import defaultdict

    r = redis_client
    memory_by_pattern = defaultdict(lambda: {'count': 0, 'bytes': 0})

    cursor = 0
    scanned = 0

    while scanned < sample_size:
        cursor, keys = r.scan(cursor, count=100)

        for key in keys:
            try:
                mem = r.memory_usage(key) or 0
                key_str = key.decode() if isinstance(key, bytes) else key

                # Match against patterns
                for pattern, prefix in patterns.items():
                    if key_str.startswith(prefix):
                        memory_by_pattern[pattern]['count'] += 1
                        memory_by_pattern[pattern]['bytes'] += mem
                        break
                else:
                    memory_by_pattern['other']['count'] += 1
                    memory_by_pattern['other']['bytes'] += mem

            except Exception:
                pass

        scanned += len(keys)
        if cursor == 0:
            break

    return dict(memory_by_pattern)

# Usage
patterns = {
    'sessions': 'session:',
    'cache': 'cache:',
    'users': 'user:',
}

analysis = analyze_memory_by_pattern(r, patterns, sample_size=50000)
for pattern, stats in sorted(analysis.items(), key=lambda x: x[1]['bytes'], reverse=True):
    mb = stats['bytes'] / 1024 / 1024
    print(f"{pattern}: {stats['count']} keys, {mb:.2f}MB")
```

### Memory Report

```bash
# Get memory report
redis-cli MEMORY DOCTOR

# Get stats about a specific key
redis-cli MEMORY USAGE mykey

# Get overall memory stats
redis-cli MEMORY STATS
```

## Scaling Strategies

### Vertical Scaling

```bash
# If you have more RAM available
CONFIG SET maxmemory 16gb
```

### Horizontal Scaling with Cluster

```python
from redis.cluster import RedisCluster

# Data distributed across multiple nodes
rc = RedisCluster(host='node1', port=6379)

# Each node handles a portion of the keyspace
rc.set('key1', 'value1')  # Goes to appropriate shard
```

### Application-Level Sharding

```python
import hashlib

class ShardedRedis:
    def __init__(self, hosts):
        self.clients = [redis.Redis(host=h) for h in hosts]
        self.num_shards = len(hosts)

    def _get_shard(self, key):
        hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
        return self.clients[hash_val % self.num_shards]

    def set(self, key, value, **kwargs):
        return self._get_shard(key).set(key, value, **kwargs)

    def get(self, key):
        return self._get_shard(key).get(key)

# Usage - data spread across 3 Redis instances
sharded = ShardedRedis(['redis-1', 'redis-2', 'redis-3'])
```

## Preventing Future Issues

1. **Set appropriate maxmemory** - Always configure a limit
2. **Choose the right eviction policy** - Match to your use case
3. **Monitor continuously** - Alert at 75% usage
4. **Use TTL on cache keys** - Prevent unbounded growth
5. **Review key patterns** - Identify and optimize memory hogs
6. **Test eviction behavior** - Ensure your app handles eviction gracefully

---

The "maximum memory reached" error is Redis protecting itself and your data. The solution depends on whether you are using Redis as a cache (enable eviction) or a database (increase memory or optimize usage). With proper configuration and monitoring, you can maintain healthy memory usage and avoid unexpected failures.
