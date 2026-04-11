# How to Implement Cache Analytics with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cache, Analytics, Monitoring, Hit Rate

Description: Learn how to implement cache analytics with Redis to track hit rates, miss rates, and key-level access patterns to optimize your caching strategy.

---

Running a cache without analytics is like driving without a speedometer. You don't know which keys are hot, what your hit rate is, or whether your TTLs are set correctly. Redis can serve as both the cache store and the analytics backend.

## Tracking Hit and Miss Counters

```python
import redis
import json
from typing import Optional

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

ANALYTICS_PREFIX = "cacheanalytics:"

def cache_get_with_tracking(key: str, namespace: str = "default") -> Optional[dict]:
    raw = r.get(key)
    hits_key = f"{ANALYTICS_PREFIX}{namespace}:hits"
    misses_key = f"{ANALYTICS_PREFIX}{namespace}:misses"

    if raw is not None:
        r.incr(hits_key)
        return json.loads(raw)
    else:
        r.incr(misses_key)
        return None

def get_hit_rate(namespace: str = "default") -> dict:
    hits = int(r.get(f"{ANALYTICS_PREFIX}{namespace}:hits") or 0)
    misses = int(r.get(f"{ANALYTICS_PREFIX}{namespace}:misses") or 0)
    total = hits + misses
    hit_rate = (hits / total * 100) if total > 0 else 0.0
    return {
        "hits": hits,
        "misses": misses,
        "total": total,
        "hit_rate_percent": round(hit_rate, 2),
    }
```

## Tracking Per-Key Access Frequency

Use a Sorted Set to track how often each key is accessed.

```python
HOT_KEYS_SET = "cacheanalytics:hotkeys"

def track_key_access(cache_key: str):
    r.zincrby(HOT_KEYS_SET, 1, cache_key)
    r.expire(HOT_KEYS_SET, 3600)  # rolling 1-hour window

def get_top_keys(n: int = 10) -> list:
    return r.zrevrange(HOT_KEYS_SET, 0, n - 1, withscores=True)

# Integrate into your cache wrapper
def cached_get(key: str) -> Optional[dict]:
    raw = r.get(key)
    track_key_access(key)
    if raw is not None:
        r.incr(f"{ANALYTICS_PREFIX}default:hits")
        return json.loads(raw)
    r.incr(f"{ANALYTICS_PREFIX}default:misses")
    return None
```

## Measuring Key Size Distribution

```python
def analyze_key_sizes(pattern: str = "cache:*", sample_size: int = 100) -> dict:
    keys = r.scan_iter(pattern, count=sample_size)
    sizes = []
    for key in list(keys)[:sample_size]:
        size = r.memory_usage(key) or 0
        sizes.append(size)

    if not sizes:
        return {}

    return {
        "sampled_keys": len(sizes),
        "avg_bytes": round(sum(sizes) / len(sizes)),
        "max_bytes": max(sizes),
        "min_bytes": min(sizes),
        "total_bytes": sum(sizes),
    }
```

## TTL Distribution Analysis

```python
def analyze_ttl_distribution(pattern: str = "cache:*", sample_size: int = 200) -> dict:
    expired = no_ttl = short = medium = long_ttl = 0

    for key in list(r.scan_iter(pattern, count=sample_size))[:sample_size]:
        ttl = r.ttl(key)
        if ttl == -2:
            expired += 1
        elif ttl == -1:
            no_ttl += 1
        elif ttl < 60:
            short += 1
        elif ttl < 600:
            medium += 1
        else:
            long_ttl += 1

    return {
        "expired_or_missing": expired,
        "no_ttl_set": no_ttl,
        "short_ttl_under_60s": short,
        "medium_ttl_1_10min": medium,
        "long_ttl_over_10min": long_ttl,
    }
```

## Dashboard via Redis CLI

```bash
# Get hit/miss counters
redis-cli GET cacheanalytics:default:hits
redis-cli GET cacheanalytics:default:misses

# Top 10 hottest keys
redis-cli ZREVRANGE cacheanalytics:hotkeys 0 9 WITHSCORES

# Redis keyspace stats
redis-cli INFO keyspace
redis-cli INFO stats | grep keyspace
```

## Summary

Cache analytics in Redis tracks hit rates via simple counters and hot keys via Sorted Sets, all using the same Redis instance as the cache. Periodic analysis of key sizes and TTL distribution helps identify oversized entries and misconfigured expiry. Use hit rate as the primary health metric - below 80% typically signals a TTL, sizing, or key design problem.

