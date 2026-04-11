# How to Calculate Cache Hit Ratio and Optimize Redis Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Performance

Description: Learn how to calculate your Redis cache hit ratio using INFO stats and apply practical strategies to push it above 90%.

---

Cache hit ratio is the most important Redis performance metric. A high ratio means most requests are served from cache; a low ratio means your database is absorbing unnecessary load. Understanding how to measure and improve it is essential for any production Redis deployment.

## What Is Cache Hit Ratio?

```text
Hit Ratio = keyspace_hits / (keyspace_hits + keyspace_misses)
```

A ratio above 90% is generally considered healthy. Below 80% often indicates misconfiguration, poor key design, or TTLs that are too short.

## Reading Hit/Miss Stats

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

Sample output:

```text
keyspace_hits:1482930
keyspace_misses:203441
```

Calculating the ratio:

```python
hits = 1482930
misses = 203441
ratio = hits / (hits + misses)
print(f"Cache hit ratio: {ratio:.2%}")  # Cache hit ratio: 87.94%
```

## Tracking Hit Ratio Over Time

Poll the INFO stats periodically and print the cumulative ratio:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_hit_ratio():
    info = r.info('stats')
    hits = info['keyspace_hits']
    misses = info['keyspace_misses']
    total = hits + misses
    if total == 0:
        return 0.0
    return hits / total

while True:
    ratio = get_hit_ratio()
    print(f"{time.strftime('%H:%M:%S')} - Hit ratio: {ratio:.2%}")
    time.sleep(30)
```

## Common Causes of Low Hit Ratio

1. **TTL too short** - Keys expire before they can be reused
2. **Cache key fragmentation** - Too many unique keys for similar data
3. **Uneven key access patterns** - Only a subset of keys are accessed frequently
4. **Cache not warmed** - Application just restarted (see cache preloading)
5. **Evictions** - Memory pressure is evicting frequently used keys

Check evictions:

```bash
redis-cli INFO stats | grep evicted_keys
redis-cli INFO memory | grep used_memory_human
```

## Strategies to Improve Hit Ratio

### Increase TTL for stable data

```bash
# Extend TTL for product catalog entries
redis-cli EXPIRE "product:42" 7200
```

### Normalize cache keys

```python
# Bad - too many unique keys
key = f"search:{query_string}:{page}:{sort_order}"

# Better - normalize before hashing
import hashlib
normalized = f"{query_string.lower().strip()}:p{page}:s{sort_order}"
key = f"search:{hashlib.md5(normalized.encode()).hexdigest()}"
```

### Use cache preloading for hot keys

Load the top N most-accessed items into Redis at startup so they are always present.

### Monitor key evictions

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb
```

Using `allkeys-lru` ensures the least recently used keys are evicted first, preserving hot keys in memory.

## Summary

Calculating your Redis cache hit ratio is straightforward using the `keyspace_hits` and `keyspace_misses` counters from `INFO stats`. A low ratio is almost always fixable through longer TTLs, better key normalization, or cache preloading. Pair these with an `allkeys-lru` eviction policy and sufficient memory to keep your hit ratio consistently above 90%.
