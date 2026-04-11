# How the allkeys-lru Eviction Policy Works in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, LRU, Eviction, Cache, Memory

Description: Learn how Redis allkeys-lru eviction selects the least recently used key across all keys using approximated LRU sampling, and when to use it for pure cache workloads.

---

The `allkeys-lru` eviction policy tells Redis to evict the least recently used key from the entire keyspace when it needs to free memory. It is the most commonly used policy for pure cache deployments where every key is expendable.

## How It Works

Redis does not maintain a true LRU doubly-linked list across all keys (that would be too expensive). Instead it uses an **approximated LRU** algorithm:

1. When memory pressure is detected, Redis randomly samples `maxmemory-samples` keys
2. From that sample, it picks the key with the oldest access time (LRU clock)
3. That key is evicted

Each Redis object stores a 24-bit LRU clock value (seconds resolution) in its header, updated on every access.

```bash
# Enable allkeys-lru with a memory limit
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru

# Tune sample size (default 5, higher = more accurate but slower)
CONFIG SET maxmemory-samples 10
```

## Setting Up

```bash
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 10
```

## When to Use allkeys-lru

Use `allkeys-lru` when:
- Redis is a **pure cache** (all keys are reconstructable)
- You do not set TTLs on all keys
- You want recently accessed data to stay in memory the longest
- Access patterns have reasonable temporal locality

```bash
# Example: Application caching without TTLs
SET product:1 "..."
SET product:2 "..."
# allkeys-lru evicts the product nobody has looked at recently
```

## Comparing LRU Sample Sizes

```python
import redis, random

r = redis.Redis()

# Set a tight memory limit for testing
r.config_set("maxmemory", "10mb")
r.config_set("maxmemory-policy", "allkeys-lru")

# Add many keys
for i in range(10000):
    r.set(f"key:{i}", "x" * 100)

# Simulate access pattern: keys 0-100 accessed frequently
for _ in range(1000):
    hot_key = random.randint(0, 100)
    r.get(f"key:{hot_key}")

# After eviction, hot keys should mostly still be present
hits = sum(1 for i in range(100) if r.exists(f"key:{i}"))
print(f"Hot keys retained: {hits}/100")
```

## Monitoring LRU Evictions

```bash
# Total evictions since startup
redis-cli INFO stats | grep evicted_keys

# Keys evicted per second (real-time)
redis-cli --stat

# Keyspace hit/miss ratio
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses
```

```python
def cache_hit_rate():
    info = r.info("stats")
    hits = info["keyspace_hits"]
    misses = info["keyspace_misses"]
    total = hits + misses
    return hits / total if total > 0 else 0.0

print(f"Cache hit rate: {cache_hit_rate():.2%}")
```

## LRU vs LFU: Which Is Better for allkeys?

| Scenario | Use allkeys-lru | Use allkeys-lfu |
|----------|----------------|----------------|
| Recent access predicts future access | Yes | No |
| Viral spikes (new data suddenly hot) | Better | Worse |
| Long-term popularity matters | No | Yes |
| Flash sales, trending content | Better | Worse |

For most general-purpose caches, `allkeys-lru` is the right default.

## Inspecting Key Age

```bash
# Check how long since a key was accessed
OBJECT IDLETIME product:1
# Returns: seconds since last access

# Keys with high idletime are candidates for eviction
```

```python
def find_stale_keys(pattern, min_idle_seconds=3600):
    stale = []
    for key in r.scan_iter(pattern):
        idle = r.object_idletime(key)
        if idle and idle > min_idle_seconds:
            stale.append((key.decode(), idle))
    return sorted(stale, key=lambda x: x[1], reverse=True)
```

## Summary

`allkeys-lru` evicts the least recently used key from the entire keyspace using an approximated LRU algorithm that samples `maxmemory-samples` keys per eviction cycle. It is the best choice for pure cache deployments where all keys are expendable and recent access is a good predictor of future access. Monitor `evicted_keys` and the hit/miss ratio to verify the policy is performing well under your workload.
