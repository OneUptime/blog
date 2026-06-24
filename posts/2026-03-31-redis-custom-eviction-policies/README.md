# How to Implement Custom Redis Eviction Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Eviction, Memory

Description: Learn how to implement custom eviction logic in Redis using keyspace notifications and Lua scripts, and choose the right built-in policy for your workload.

---

Redis evicts keys when memory reaches `maxmemory`. The built-in policies (LRU, LFU, TTL-based) cover most use cases, but some workloads need more fine-grained control. You can approximate custom eviction using keyspace notifications, sorted sets for priority tracking, or a custom Redis module.

## Built-In Eviction Policies

```text
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru     # LRU across all keys
# maxmemory-policy allkeys-lfu   # LFU across all keys
# maxmemory-policy volatile-ttl  # Evict keys with TTL, shortest first
# maxmemory-policy noeviction    # Return error when memory is full
```

Check current policy:

```bash
redis-cli CONFIG GET maxmemory-policy
redis-cli INFO memory | grep used_memory_human
```

## Custom Priority-Based Eviction with Sorted Sets

Track key priority in a sorted set and evict low-priority keys first when memory is high:

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def set_with_priority(key: str, value: str, priority: int, ttl: int = 3600):
    pipe = r.pipeline()
    pipe.setex(key, ttl, value)
    pipe.zadd("eviction:priority", {key: priority})
    pipe.execute()

def evict_lowest_priority(count: int = 10):
    # Get keys with lowest priority score
    keys_to_evict = r.zrange("eviction:priority", 0, count - 1)
    if not keys_to_evict:
        return 0

    pipe = r.pipeline()
    for key in keys_to_evict:
        pipe.delete(key)
        pipe.zrem("eviction:priority", key)
    pipe.execute()
    return len(keys_to_evict)

# Set keys with different priorities
set_with_priority("cache:product:1", "widget", priority=10)
set_with_priority("cache:product:2", "gadget", priority=5)
set_with_priority("cache:session:abc", "user_data", priority=100)

# Evict 1 lowest-priority key
evicted = evict_lowest_priority(1)
print(f"Evicted {evicted} keys")
# cache:product:2 is evicted first (priority 5)
```

## Evict Keys by Access Frequency Using Redis Keyspace

```bash
# Enable keyspace notifications for expired and evicted events
redis-cli CONFIG SET notify-keyspace-events "ExKg"
```

```python
def track_access(r, key: str):
    r.zincrby("access:frequency", 1, key)

def evict_cold_keys(r, keep_top: int = 1000):
    total = r.zcard("access:frequency")
    if total > keep_top:
        cold_keys = r.zrange("access:frequency", 0, total - keep_top - 1)
        if cold_keys:
            pipe = r.pipeline()
            for key in cold_keys:
                pipe.delete(key)
                pipe.zrem("access:frequency", key)
            pipe.execute()
            print(f"Evicted {len(cold_keys)} cold keys")

# Usage
track_access(r, "product:1")
track_access(r, "product:1")  # accessed twice
track_access(r, "product:2")  # accessed once
evict_cold_keys(r, keep_top=1)
```

## Time-Windowed Eviction with Sorted Sets

Keep only keys accessed within a rolling time window:

```python
import time

def record_access(r, key: str):
    ts = time.time()
    r.zadd("recent:access", {key: ts})

def evict_stale(r, max_age_seconds: int = 300):
    cutoff = time.time() - max_age_seconds
    old_keys = r.zrangebyscore("recent:access", "-inf", cutoff)
    if old_keys:
        pipe = r.pipeline()
        for key in old_keys:
            pipe.delete(key)
        pipe.zremrangebyscore("recent:access", "-inf", cutoff)
        pipe.execute()
        print(f"Evicted {len(old_keys)} stale keys")
```

## Monitor Eviction Rate

```bash
redis-cli INFO stats | grep evicted_keys
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# Calculate hit rate
# hit_rate = hits / (hits + misses)
```

## Summary

Redis built-in policies like `allkeys-lru` and `allkeys-lfu` handle most eviction needs. For custom behavior, maintain a sorted set with priority or frequency scores and evict keys programmatically based on application logic. Time-windowed eviction using sorted set scores provides an alternative to TTL-based expiration for access-pattern-aware cache management.
