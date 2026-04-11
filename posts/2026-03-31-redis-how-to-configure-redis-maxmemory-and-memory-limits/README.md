# How to Configure Redis maxmemory and Memory Limits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Configuration, Memory Management, Eviction Policy

Description: Learn how to configure Redis maxmemory and eviction policies to prevent out-of-memory errors and control how Redis handles memory pressure.

---

## What Is maxmemory in Redis?

The `maxmemory` configuration directive sets an upper bound on how much memory Redis can use for storing data. When this limit is reached, Redis applies an eviction policy to decide what to do with new write requests.

Configuring maxmemory is critical for production deployments to prevent Redis from consuming all available system memory and causing OOM (out-of-memory) kills.

## Setting maxmemory in redis.conf

```text
# redis.conf

# Set to 512 megabytes
maxmemory 512mb

# Set to 2 gigabytes
maxmemory 2gb

# Set to 256 megabytes using bytes
maxmemory 268435456

# Disable memory limit (default, not recommended for production)
maxmemory 0
```

A plain number without a suffix is interpreted as bytes. Supported suffixes: `k` (1000 bytes), `kb` (1024 bytes), `m` (1,000,000 bytes), `mb` (1024*1024 bytes), `g` (1,000,000,000 bytes), `gb` (1024*1024*1024 bytes). Suffixes are case-insensitive.

## Setting maxmemory at Runtime

You can change maxmemory without restarting Redis:

```bash
# Set via redis-cli
redis-cli CONFIG SET maxmemory 1gb

# Verify the setting
redis-cli CONFIG GET maxmemory
# 1) "maxmemory"
# 2) "1073741824"

# Check current memory usage
redis-cli INFO memory | grep used_memory_human
# used_memory_human: 45.32M
```

## Choosing an Eviction Policy

When maxmemory is reached, the `maxmemory-policy` directive controls behavior:

| Policy | Description |
|--------|-------------|
| noeviction | Return errors on writes when full (default) |
| allkeys-lru | Evict least recently used keys from all keys |
| volatile-lru | Evict LRU keys that have a TTL set |
| allkeys-lfu | Evict least frequently used keys from all keys |
| volatile-lfu | Evict LFU keys that have a TTL set |
| allkeys-random | Evict random keys from all keys |
| volatile-random | Evict random keys that have a TTL |
| volatile-ttl | Evict keys with shortest remaining TTL first |

```text
# redis.conf

# For cache use case - evict least recently used
maxmemory-policy allkeys-lru

# For session store - only evict expiring keys
maxmemory-policy volatile-lru

# For strict data store - never evict, return errors
maxmemory-policy noeviction
```

## Recommended Configuration for Cache Use Case

```text
# redis.conf - cache configuration

maxmemory 2gb
maxmemory-policy allkeys-lfu

# Sample size for LFU/LRU approximation (higher = more accurate, slower)
maxmemory-samples 10

# LFU decay factor (lower = faster decay of frequency counts)
lfu-decay-time 1

# LFU counter log factor (higher = more hits needed to saturate, better differentiation)
lfu-log-factor 10
```

## Recommended Configuration for Session Store

```text
# redis.conf - session store with TTL-based eviction

maxmemory 4gb
maxmemory-policy volatile-lru
maxmemory-samples 5
```

## Monitoring Memory Usage

```bash
# Detailed memory report
redis-cli INFO memory

# Key fields:
# used_memory: total bytes allocated for data
# used_memory_human: human-readable
# used_memory_rss: memory from OS perspective (includes fragmentation)
# mem_fragmentation_ratio: ratio of rss to used_memory
#   > 1.5 = high fragmentation, consider active-defrag
#   < 1.0 = memory swapping, system RAM exhausted

# Check eviction stats
redis-cli INFO stats | grep evicted
# evicted_keys: 42810
```

## Python Example: Memory Monitoring

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_memory_stats() -> dict:
    """Get key memory metrics from Redis."""
    info = r.info("memory")
    return {
        "used_memory_mb": info["used_memory"] / (1024 * 1024),
        "used_memory_rss_mb": info["used_memory_rss"] / (1024 * 1024),
        "maxmemory_mb": info.get("maxmemory", 0) / (1024 * 1024),
        "fragmentation_ratio": info.get("mem_fragmentation_ratio", 1.0),
        "evicted_keys": r.info("stats").get("evicted_keys", 0),
    }

def check_memory_pressure(threshold_pct: float = 0.85) -> bool:
    """Return True if memory usage exceeds threshold percentage."""
    stats = get_memory_stats()
    if stats["maxmemory_mb"] == 0:
        return False  # No limit set
    usage_ratio = stats["used_memory_mb"] / stats["maxmemory_mb"]
    if usage_ratio >= threshold_pct:
        print(f"WARNING: Memory at {usage_ratio:.1%} of limit")
        return True
    return False

stats = get_memory_stats()
print(f"Memory used: {stats['used_memory_mb']:.1f}MB")
print(f"Max memory: {stats['maxmemory_mb']:.1f}MB")
print(f"Fragmentation ratio: {stats['fragmentation_ratio']:.2f}")
print(f"Evicted keys: {stats['evicted_keys']}")

check_memory_pressure()
```

## Setting maxmemory Per-Instance in Docker

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
```

## Summary

`maxmemory` sets an upper bound on Redis memory consumption, and `maxmemory-policy` controls what happens when that limit is reached. For cache use cases, use `allkeys-lru` or `allkeys-lfu` to automatically evict old data. For session stores, use `volatile-lru` to only evict keys with expiration times. For primary data stores, use `noeviction` and add alerting on memory pressure. Always set maxmemory in production to prevent OOM conditions.
