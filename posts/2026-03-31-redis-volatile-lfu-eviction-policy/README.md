# How the volatile-lfu Eviction Policy Works in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, LFU, Eviction, TTL, Memory

Description: Learn how Redis volatile-lfu evicts only TTL-bearing keys using least-frequently-used ordering, protecting both persistent data and popular cache entries.

---

The `volatile-lfu` eviction policy combines two protections: it only evicts keys that have a TTL set (like `volatile-lru`), and it selects the least frequently accessed among them (like `allkeys-lfu`). This is the most selective eviction policy for mixed-use Redis instances.

## How It Works

When Redis needs to free memory under `volatile-lfu`:

1. Redis considers only keys that have an expiry (TTL) set
2. Among those keys, it samples `maxmemory-samples` candidates
3. It evicts the key with the lowest LFU counter (least frequently accessed)

Keys without a TTL are never evicted, regardless of their access frequency.

## Configuration

```bash
CONFIG SET maxmemory 4gb
CONFIG SET maxmemory-policy volatile-lfu

# LFU tuning
CONFIG SET lfu-log-factor 10
CONFIG SET lfu-decay-time 1
```

## Designing for volatile-lfu

```python
import redis, json

r = redis.Redis()

class CacheLayer:
    def __init__(self):
        r.config_set("maxmemory-policy", "volatile-lfu")

    def cache(self, key, value, ttl=3600):
        """Cache items with TTL - eligible for LFU eviction."""
        r.set(f"cache:{key}", json.dumps(value), ex=ttl)

    def persist(self, key, value):
        """Persistent data without TTL - never evicted."""
        r.set(f"persist:{key}", json.dumps(value))
        # No expiry = invisible to volatile-lfu eviction

cache = CacheLayer()

# Frequently accessed cache entry
cache.cache("product:bestseller", {"name": "Widget", "price": 9.99}, ttl=7200)

# Rarely accessed cache entry
cache.cache("product:obscure", {"name": "Niche Item", "price": 199.99}, ttl=7200)

# Protected persistent data
cache.persist("config:pricing_rules", {"vat_rate": 0.2})
```

## volatile-lfu vs volatile-lru

The difference becomes clear under a skewed access pattern:

```python
# Set up competing cached items
r.set("hot_cache", "popular data", ex=3600)
r.set("cold_cache", "rarely needed", ex=3600)

# Simulate access pattern
for _ in range(500):
    r.get("hot_cache")   # Very frequently accessed

for _ in range(2):
    r.get("cold_cache")  # Rarely accessed

# Under volatile-lru: "hot_cache" risks eviction if recently accessed was cold_cache
# Under volatile-lfu: "cold_cache" is evicted because its frequency count is lower
```

## LFU Counter for Cache Keys

```bash
# Inspect LFU counters on cache keys
OBJECT FREQ cache:product:bestseller
# Returns: 240 (high frequency)

OBJECT FREQ cache:product:obscure
# Returns: 3 (low frequency - eviction candidate)
```

## When volatile-lfu Beats volatile-lru

| Scenario | volatile-lru | volatile-lfu |
|----------|-------------|-------------|
| Popular item not accessed in last 10s | May evict | Protects (high counter) |
| Rarely accessed item with long TTL | May keep | Evicts (low counter) |
| New item with no access history | Protects (just set) | May evict (counter starts at 5) |

`volatile-lfu` is ideal when you want Redis to learn which cached items are genuinely popular and protect them even during brief gaps in access.

## Handling New Keys with Low Frequency

A new cache entry starts with a low LFU counter and could be evicted immediately under memory pressure. Mitigations:

```python
def warm_cache_entry(key, value, ttl=3600, warmup_count=5):
    """Write and artificially pre-warm a cache entry."""
    r.set(key, json.dumps(value), ex=ttl)
    # Pre-read a few times to build up the LFU counter
    for _ in range(warmup_count):
        r.get(key)
```

## Monitoring

```bash
# Check eviction count
INFO stats | grep evicted_keys

# Keyspace info: how many keys have TTLs
INFO keyspace
# db0:keys=100000,expires=95000,avg_ttl=3600000
```

## Summary

`volatile-lfu` is the most protective eviction policy for mixed-use Redis instances - it restricts eviction to TTL-bearing keys and further prioritizes evicting those with the lowest access frequency. Use it when your Redis instance holds both persistent data (without TTLs) and cache data (with TTLs), and when popular cache entries should be protected from eviction even during brief periods of low access activity.
