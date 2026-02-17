# How to Fix 'Redis out of memory' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Troubleshooting, Performance, DevOps

Description: Learn how to diagnose and resolve Redis out of memory errors, configure memory limits properly, implement eviction policies, and optimize memory usage.

---

When Redis runs out of memory, it starts rejecting write commands with the error "OOM command not allowed when used memory > 'maxmemory'". This can bring your application to a halt. Let us explore how to diagnose, fix, and prevent these errors.

## Understanding Redis Memory

Redis stores everything in RAM. When the dataset grows larger than available memory, Redis cannot accept new writes unless configured to evict data.

```bash
# Check current memory status
redis-cli INFO memory

# Key metrics:
# used_memory: 4294967296          # Bytes used by Redis
# used_memory_human: 4.00G         # Human-readable
# maxmemory: 5368709120            # Configured limit
# maxmemory_human: 5.00G           # Human-readable
# maxmemory_policy: noeviction     # What happens when limit is reached
# mem_fragmentation_ratio: 1.15    # Memory fragmentation
```

## Immediate Fix: Increase Memory

The quickest fix is to allow Redis more memory:

```bash
# Increase maxmemory at runtime
redis-cli CONFIG SET maxmemory 8gb

# Make it permanent in redis.conf
maxmemory 8gb
```

However, this is just a temporary solution. You need to understand why memory is growing.

## Diagnosing Memory Usage

### Find Large Keys

```bash
# Scan for big keys (samples randomly, does not scan all)
redis-cli --bigkeys

# Sample output:
# [00.00%] Biggest string found so far 'session:large' with 1048576 bytes
# [00.00%] Biggest list found so far 'queue:emails' with 50000 items
# [00.00%] Biggest hash found so far 'user:12345' with 500 fields

# For more detailed analysis
redis-cli MEMORY USAGE session:large
```

### Memory by Data Type

```python
import redis
from collections import defaultdict

def analyze_memory_by_type(redis_client, sample_size=10000):
    """Analyze memory usage by key patterns."""
    r = redis_client
    memory_by_pattern = defaultdict(lambda: {'count': 0, 'bytes': 0})

    cursor = 0
    scanned = 0

    while scanned < sample_size:
        cursor, keys = r.scan(cursor, count=100)

        for key in keys:
            try:
                # Get memory usage
                mem = r.memory_usage(key) or 0

                # Extract pattern (first part of key)
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                pattern = key_str.split(':')[0] if ':' in key_str else key_str

                memory_by_pattern[pattern]['count'] += 1
                memory_by_pattern[pattern]['bytes'] += mem
            except:
                pass

        scanned += len(keys)

        if cursor == 0:
            break

    # Sort by memory usage
    sorted_patterns = sorted(
        memory_by_pattern.items(),
        key=lambda x: x[1]['bytes'],
        reverse=True
    )

    return sorted_patterns

# Usage
r = redis.Redis()
patterns = analyze_memory_by_type(r, sample_size=50000)

print("Memory by key pattern:")
for pattern, stats in patterns[:10]:
    mb = stats['bytes'] / 1024 / 1024
    print(f"  {pattern}: {stats['count']} keys, {mb:.2f} MB")
```

### Check for Memory Leaks

Keys without TTL can accumulate forever:

```python
def find_keys_without_ttl(redis_client, pattern='*', limit=1000):
    """Find keys that never expire."""
    r = redis_client
    no_ttl_keys = []
    cursor = 0
    checked = 0

    while checked < limit:
        cursor, keys = r.scan(cursor, match=pattern, count=100)

        for key in keys:
            ttl = r.ttl(key)
            if ttl == -1:  # No expiration set
                no_ttl_keys.append(key)

        checked += len(keys)

        if cursor == 0:
            break

    return no_ttl_keys

# Usage
no_expire = find_keys_without_ttl(r, pattern='cache:*', limit=10000)
print(f"Found {len(no_expire)} cache keys without TTL")
```

## Configuring Eviction Policies

When maxmemory is reached, Redis can automatically evict keys based on your chosen policy:

```bash
# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

Available policies:

| Policy | Description |
|--------|-------------|
| noeviction | Return error on writes (default) |
| allkeys-lru | Evict least recently used keys |
| allkeys-lfu | Evict least frequently used keys |
| volatile-lru | Evict LRU keys with TTL set |
| volatile-lfu | Evict LFU keys with TTL set |
| allkeys-random | Evict random keys |
| volatile-random | Evict random keys with TTL |
| volatile-ttl | Evict keys with shortest TTL |

### Choosing the Right Policy

```python
# For caching workloads (all keys are cache)
# Use allkeys-lru or allkeys-lfu
# CONFIG SET maxmemory-policy allkeys-lru

# For mixed workloads (some data must persist)
# Set TTL on cacheable data, use volatile-lru
# CONFIG SET maxmemory-policy volatile-lru

# For session storage
# All sessions should have TTL, use volatile-ttl
# CONFIG SET maxmemory-policy volatile-ttl
```

## Memory Optimization Strategies

### 1. Use Appropriate Data Structures

```python
# Bad: Storing JSON strings
r.set('user:123', '{"name": "Alice", "email": "alice@example.com"}')

# Better: Use hashes (more memory efficient for small objects)
r.hset('user:123', mapping={'name': 'Alice', 'email': 'alice@example.com'})

# Check the difference
print(f"String: {r.memory_usage('user:123:string')} bytes")
print(f"Hash: {r.memory_usage('user:123')} bytes")
```

### 2. Enable Compression for Large Values

```python
import zlib
import json

class CompressedCache:
    """Cache with compression for large values."""

    def __init__(self, redis_client, compression_threshold=1024):
        self.r = redis_client
        self.threshold = compression_threshold

    def set(self, key: str, value: any, ex: int = None):
        data = json.dumps(value).encode('utf-8')

        if len(data) > self.threshold:
            # Compress large values
            compressed = zlib.compress(data)
            self.r.set(f"z:{key}", compressed, ex=ex)
        else:
            self.r.set(key, data, ex=ex)

    def get(self, key: str):
        # Try compressed first
        data = self.r.get(f"z:{key}")
        if data:
            decompressed = zlib.decompress(data)
            return json.loads(decompressed)

        # Try uncompressed
        data = self.r.get(key)
        if data:
            return json.loads(data)

        return None

# Usage
cache = CompressedCache(r)
large_data = {'items': list(range(10000))}
cache.set('large:data', large_data, ex=3600)
```

### 3. Use Integer Encoding

Redis can store small integers more efficiently:

```python
# Redis internally optimizes integers
r.set('counter', 12345)  # Stored efficiently as integer

# Avoid storing numbers as strings unnecessarily
r.set('counter', '12345')  # Takes more memory
```

### 4. Hash Field Compression (Redis 7+)

```bash
# Configure hash field compression
hash-max-listpack-entries 512
hash-max-listpack-value 64
```

### 5. Shorter Key Names

```python
# Long keys waste memory
r.set('user:profile:data:version:1:12345', 'value')

# Shorter keys save memory at scale
r.set('u:p:12345', 'value')

# With millions of keys, this adds up
```

## Handling Memory Pressure

### Graceful Degradation

```python
import redis
from redis.exceptions import ResponseError

class ResilientCache:
    """Cache that handles OOM gracefully."""

    def __init__(self, redis_client):
        self.r = redis_client

    def set(self, key: str, value: str, ex: int = 3600):
        try:
            return self.r.set(key, value, ex=ex)
        except ResponseError as e:
            if 'OOM' in str(e):
                # Try to make room
                self._emergency_cleanup()
                # Retry once
                try:
                    return self.r.set(key, value, ex=ex)
                except:
                    return False
            raise

    def _emergency_cleanup(self):
        """Emergency cleanup when OOM occurs."""
        # Delete some low-priority keys
        cursor = 0
        deleted = 0

        while deleted < 1000:
            cursor, keys = self.r.scan(
                cursor,
                match='cache:low_priority:*',
                count=100
            )

            if keys:
                self.r.delete(*keys)
                deleted += len(keys)

            if cursor == 0:
                break
```

### Memory Monitoring

```python
def check_memory_health(redis_client):
    """Check Redis memory health and return warnings."""
    info = redis_client.info('memory')

    used = info['used_memory']
    max_mem = info.get('maxmemory', 0)
    frag_ratio = info.get('mem_fragmentation_ratio', 1.0)

    warnings = []

    if max_mem > 0:
        usage_pct = (used / max_mem) * 100
        if usage_pct > 90:
            warnings.append(f"CRITICAL: Memory usage at {usage_pct:.1f}%")
        elif usage_pct > 75:
            warnings.append(f"WARNING: Memory usage at {usage_pct:.1f}%")

    if frag_ratio > 1.5:
        warnings.append(f"WARNING: High fragmentation ratio: {frag_ratio:.2f}")

    return {
        'used_memory_mb': used / 1024 / 1024,
        'max_memory_mb': max_mem / 1024 / 1024 if max_mem else None,
        'usage_percent': (used / max_mem * 100) if max_mem else None,
        'fragmentation_ratio': frag_ratio,
        'warnings': warnings
    }

# Run periodically
health = check_memory_health(r)
for warning in health['warnings']:
    print(warning)
```

## Defragmentation

High fragmentation wastes memory. Redis 4.0+ has active defragmentation:

```bash
# Enable active defragmentation
CONFIG SET activedefrag yes

# Configure thresholds
CONFIG SET active-defrag-ignore-bytes 100mb
CONFIG SET active-defrag-threshold-lower 10
CONFIG SET active-defrag-threshold-upper 100
CONFIG SET active-defrag-cycle-min 1
CONFIG SET active-defrag-cycle-max 25

# Check fragmentation
INFO memory | grep fragmentation
```

## Scaling Out

When a single Redis instance cannot handle your data:

### Redis Cluster

```python
from redis.cluster import RedisCluster

# Data automatically sharded across nodes
rc = RedisCluster(
    host='redis-node-1',
    port=6379
)

# Each node handles a portion of the keyspace
rc.set('user:1', 'data')  # Routes to appropriate shard
```

### Application-Level Sharding

```python
import hashlib

class ShardedRedis:
    """Simple consistent hashing across Redis instances."""

    def __init__(self, hosts):
        self.clients = [redis.Redis(host=h) for h in hosts]
        self.num_shards = len(hosts)

    def _get_shard(self, key: str) -> redis.Redis:
        hash_val = int(hashlib.md5(key.encode()).hexdigest(), 16)
        shard_idx = hash_val % self.num_shards
        return self.clients[shard_idx]

    def set(self, key: str, value: str, **kwargs):
        return self._get_shard(key).set(key, value, **kwargs)

    def get(self, key: str):
        return self._get_shard(key).get(key)

# Usage
sharded = ShardedRedis(['redis-1', 'redis-2', 'redis-3'])
sharded.set('user:123', 'data')
```

---

Out of memory errors in Redis are a signal that your data is growing beyond your infrastructure's capacity. The fix involves a combination of proper memory limits, appropriate eviction policies, data optimization, and potentially scaling out. Monitor memory usage proactively, set alerts at 75% capacity, and you will have time to address issues before they become emergencies.
