# How to Debug Redis 'OOM command not allowed' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Troubleshooting, Memory Management, OOM, Eviction Policies

Description: A comprehensive guide to diagnosing and resolving Redis 'OOM command not allowed when used memory > 'maxmemory'' errors, including memory analysis, eviction policy configuration, and prevention strategies.

---

The dreaded "OOM command not allowed when used memory > 'maxmemory'" error is one of the most common Redis issues in production environments. This error occurs when Redis has reached its configured memory limit and cannot execute write commands. In this guide, we will explore the root causes, diagnostic techniques, and solutions to resolve and prevent this error.

## Understanding the Error

When Redis returns this error, it means:

1. Redis has a `maxmemory` limit configured
2. Current memory usage has reached or exceeded that limit
3. The current eviction policy cannot free enough memory to accommodate the new write
4. Redis refuses the write command to prevent further memory growth

```
(error) OOM command not allowed when used memory > 'maxmemory'
```

## Step 1: Check Current Memory Status

First, gather information about Redis memory usage:

```bash
# Connect to Redis and check memory info
redis-cli INFO memory
```

Key metrics to examine:

```
used_memory:4294967296
used_memory_human:4.00G
used_memory_rss:4831838208
used_memory_rss_human:4.50G
used_memory_peak:4294967296
used_memory_peak_human:4.00G
maxmemory:4294967296
maxmemory_human:4.00G
maxmemory_policy:noeviction
mem_fragmentation_ratio:1.12
```

```bash
# Quick memory check
redis-cli MEMORY STATS
```

## Step 2: Understand Eviction Policies

The `maxmemory-policy` setting determines how Redis handles memory limits:

| Policy | Behavior |
|--------|----------|
| `noeviction` | Returns errors when memory limit is reached (default) |
| `allkeys-lru` | Evicts least recently used keys from all keys |
| `volatile-lru` | Evicts LRU keys only from keys with TTL set |
| `allkeys-random` | Evicts random keys from all keys |
| `volatile-random` | Evicts random keys from keys with TTL set |
| `volatile-ttl` | Evicts keys with shortest TTL first |
| `allkeys-lfu` | Evicts least frequently used keys (Redis 4.0+) |
| `volatile-lfu` | Evicts LFU keys only from keys with TTL set |

If you are using `noeviction` (the default), Redis will not automatically remove keys and will return OOM errors.

## Step 3: Configure an Appropriate Eviction Policy

Choose and set an eviction policy based on your use case:

```bash
# For cache workloads - evict least recently used keys
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Make it persistent
redis-cli CONFIG REWRITE
```

For different scenarios:

```bash
# Session store - only evict sessions with TTL
redis-cli CONFIG SET maxmemory-policy volatile-lru

# Rate limiting - evict least frequently used
redis-cli CONFIG SET maxmemory-policy allkeys-lfu

# Mixed workload - protect persistent data
redis-cli CONFIG SET maxmemory-policy volatile-ttl
```

## Step 4: Analyze Memory Usage by Key Pattern

Identify what is consuming memory:

```bash
# Use redis-cli with --bigkeys to find large keys
redis-cli --bigkeys

# Sample output:
# Biggest string found 'user:session:abc123' has 1048576 bytes
# Biggest list found 'queue:events' has 250000 items
# Biggest hash found 'cache:products' has 50000 fields
```

For more detailed analysis:

```bash
# Memory usage for specific key
redis-cli MEMORY USAGE mykey

# Memory analysis with sampling
redis-cli MEMORY DOCTOR
```

## Step 5: Analyze Keys with a Script

Create a script to analyze memory by key pattern:

```python
import redis
from collections import defaultdict

def analyze_memory_by_pattern(host='localhost', port=6379, sample_size=10000):
    r = redis.Redis(host=host, port=port, decode_responses=True)

    pattern_memory = defaultdict(lambda: {'count': 0, 'memory': 0})

    cursor = 0
    scanned = 0

    while scanned < sample_size:
        cursor, keys = r.scan(cursor=cursor, count=1000)

        for key in keys:
            # Extract pattern (first part before colon)
            pattern = key.split(':')[0] if ':' in key else key

            try:
                memory = r.memory_usage(key)
                if memory:
                    pattern_memory[pattern]['count'] += 1
                    pattern_memory[pattern]['memory'] += memory
            except redis.ResponseError:
                pass

            scanned += 1
            if scanned >= sample_size:
                break

        if cursor == 0:
            break

    # Sort by memory usage
    sorted_patterns = sorted(
        pattern_memory.items(),
        key=lambda x: x[1]['memory'],
        reverse=True
    )

    print(f"Memory Analysis (sampled {scanned} keys):")
    print("-" * 60)
    for pattern, stats in sorted_patterns[:20]:
        memory_mb = stats['memory'] / (1024 * 1024)
        print(f"{pattern}: {stats['count']} keys, {memory_mb:.2f} MB")

if __name__ == '__main__':
    analyze_memory_by_pattern()
```

## Step 6: Implement Key Expiration

Ensure keys have appropriate TTLs:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Always set TTL when creating cache keys
def cache_set(key, value, ttl_seconds=3600):
    """Set a cache key with mandatory TTL"""
    r.setex(key, ttl_seconds, value)

# Find keys without TTL
def find_keys_without_ttl(pattern='*', sample_size=1000):
    """Find keys that might be missing TTL"""
    keys_without_ttl = []
    cursor = 0
    checked = 0

    while checked < sample_size:
        cursor, keys = r.scan(cursor=cursor, match=pattern, count=100)

        for key in keys:
            ttl = r.ttl(key)
            if ttl == -1:  # No expiration set
                keys_without_ttl.append(key.decode('utf-8'))
            checked += 1

        if cursor == 0:
            break

    return keys_without_ttl

# Add TTL to existing keys
def add_ttl_to_keys(pattern, ttl_seconds):
    """Add TTL to keys matching pattern"""
    cursor = 0
    updated = 0

    while True:
        cursor, keys = r.scan(cursor=cursor, match=pattern, count=100)

        for key in keys:
            if r.ttl(key) == -1:
                r.expire(key, ttl_seconds)
                updated += 1

        if cursor == 0:
            break

    return updated
```

## Step 7: Increase Memory Limit (If Appropriate)

If your workload legitimately needs more memory:

```bash
# Check current limit
redis-cli CONFIG GET maxmemory

# Increase limit (example: 8GB)
redis-cli CONFIG SET maxmemory 8gb

# Persist the change
redis-cli CONFIG REWRITE
```

Or update `redis.conf`:

```conf
# Set maximum memory to 8GB
maxmemory 8gb

# Use LRU eviction for cache workloads
maxmemory-policy allkeys-lru

# Number of keys to sample for eviction
maxmemory-samples 10
```

## Step 8: Reduce Memory Fragmentation

High fragmentation wastes memory:

```bash
# Check fragmentation ratio
redis-cli INFO memory | grep mem_fragmentation_ratio

# If ratio > 1.5, consider these options:

# Option 1: Enable active defragmentation (Redis 4.0+)
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-ignore-bytes 100mb
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-threshold-upper 100

# Option 2: Restart Redis (causes brief downtime)
# This releases fragmented memory back to OS
```

## Step 9: Optimize Data Structures

Use memory-efficient data structures:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379)

# Instead of storing each field as separate key
# BAD: High memory overhead
def store_user_bad(user_id, data):
    for field, value in data.items():
        r.set(f'user:{user_id}:{field}', value)

# GOOD: Use hash for small objects (ziplist encoding)
def store_user_good(user_id, data):
    r.hset(f'user:{user_id}', mapping=data)

# For time-series data, use sorted sets instead of many keys
def store_metrics_efficient(metric_name, timestamp, value):
    # Store as score:member in sorted set
    r.zadd(f'metrics:{metric_name}', {f'{timestamp}:{value}': timestamp})

    # Keep only last 24 hours
    cutoff = timestamp - 86400
    r.zremrangebyscore(f'metrics:{metric_name}', '-inf', cutoff)
```

## Step 10: Implement Memory Monitoring and Alerts

Set up proactive monitoring:

```python
import redis
import time

def monitor_memory(host='localhost', port=6379, threshold_percent=80):
    """Monitor Redis memory and alert when threshold exceeded"""
    r = redis.Redis(host=host, port=port)

    while True:
        info = r.info('memory')

        used = info['used_memory']
        maxmem = info.get('maxmemory', 0)

        if maxmem > 0:
            usage_percent = (used / maxmem) * 100

            print(f"Memory: {used / (1024**3):.2f}GB / "
                  f"{maxmem / (1024**3):.2f}GB ({usage_percent:.1f}%)")

            if usage_percent >= threshold_percent:
                alert_high_memory(usage_percent, info)
        else:
            print(f"Memory: {used / (1024**3):.2f}GB (no limit set)")

        time.sleep(60)

def alert_high_memory(usage_percent, info):
    """Send alert for high memory usage"""
    message = f"""
    Redis Memory Alert!

    Usage: {usage_percent:.1f}%
    Used Memory: {info['used_memory_human']}
    Peak Memory: {info['used_memory_peak_human']}
    Fragmentation Ratio: {info['mem_fragmentation_ratio']}
    Evicted Keys: {info.get('evicted_keys', 0)}
    """
    print(f"ALERT: {message}")
    # Send to your alerting system (PagerDuty, Slack, etc.)
```

## Prevention Strategies

### 1. Always Set TTLs for Cache Data

```python
# Use wrapper functions that enforce TTL
class RedisCache:
    def __init__(self, redis_client, default_ttl=3600):
        self.redis = redis_client
        self.default_ttl = default_ttl

    def set(self, key, value, ttl=None):
        ttl = ttl or self.default_ttl
        self.redis.setex(key, ttl, value)

    def get(self, key):
        return self.redis.get(key)
```

### 2. Implement Circuit Breakers

```python
import redis
from functools import wraps

class RedisCircuitBreaker:
    def __init__(self, redis_client, memory_threshold=0.9):
        self.redis = redis_client
        self.memory_threshold = memory_threshold

    def check_memory(self):
        info = self.redis.info('memory')
        maxmem = info.get('maxmemory', 0)
        if maxmem > 0:
            return info['used_memory'] / maxmem
        return 0

    def write_allowed(self):
        return self.check_memory() < self.memory_threshold

    def safe_set(self, key, value, ex=None):
        if not self.write_allowed():
            raise MemoryError("Redis memory threshold exceeded")
        return self.redis.set(key, value, ex=ex)
```

### 3. Regular Cleanup Jobs

```python
import redis
from datetime import datetime

def cleanup_old_data(r, patterns_with_ttl):
    """Clean up keys that should have TTLs but don't"""

    for pattern, ttl in patterns_with_ttl.items():
        cursor = 0
        cleaned = 0

        while True:
            cursor, keys = r.scan(cursor=cursor, match=pattern, count=100)

            for key in keys:
                current_ttl = r.ttl(key)
                if current_ttl == -1:  # No TTL set
                    r.expire(key, ttl)
                    cleaned += 1

            if cursor == 0:
                break

        print(f"Added TTL to {cleaned} keys matching {pattern}")

# Usage
r = redis.Redis(host='localhost', port=6379)
cleanup_old_data(r, {
    'session:*': 86400,      # 24 hours
    'cache:*': 3600,         # 1 hour
    'temp:*': 300,           # 5 minutes
})
```

## Quick Reference: OOM Resolution Checklist

1. Check current memory status with `INFO memory`
2. Identify large keys with `--bigkeys`
3. Review and update `maxmemory-policy`
4. Add TTLs to keys missing expiration
5. Optimize data structures for memory efficiency
6. Consider increasing `maxmemory` if workload is legitimate
7. Enable active defragmentation if fragmentation is high
8. Set up monitoring and alerts for proactive management

## Conclusion

Redis OOM errors are preventable with proper configuration and monitoring. The key is to choose an appropriate eviction policy for your workload, ensure keys have TTLs, and monitor memory usage proactively. By implementing the strategies in this guide, you can keep your Redis instances running smoothly without memory-related outages.

Remember that Redis is designed for fast, in-memory operations - it is not a replacement for persistent storage. Design your data model with memory constraints in mind, and always have a plan for what happens when memory limits are reached.
