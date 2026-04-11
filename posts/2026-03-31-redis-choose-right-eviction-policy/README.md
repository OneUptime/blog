# How to Choose the Right Redis Eviction Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Eviction, Memory, Configuration, Cache

Description: A practical guide to the eight Redis eviction policies, when to use each, and how to match the policy to your application's cache access patterns.

---

When Redis reaches its `maxmemory` limit, it must evict keys to make room for new data. Redis offers eight eviction policies - choosing the wrong one can lead to cache thrashing, data loss, or OOM errors. This guide helps you make the right choice.

## The Eight Policies

| Policy | Evicts from | Algorithm |
|--------|-------------|-----------|
| `noeviction` | N/A | Returns error instead of evicting |
| `allkeys-lru` | All keys | Least recently used |
| `volatile-lru` | Keys with TTL | Least recently used |
| `allkeys-lfu` | All keys | Least frequently used |
| `volatile-lfu` | Keys with TTL | Least frequently used |
| `allkeys-random` | All keys | Random selection |
| `volatile-random` | Keys with TTL | Random selection |
| `volatile-ttl` | Keys with TTL | Soonest-to-expire first |

## Checking and Setting the Policy

```bash
# Check current policy
CONFIG GET maxmemory-policy

# Set a new policy
CONFIG SET maxmemory-policy allkeys-lru

# Set in redis.conf for persistence
# maxmemory-policy allkeys-lru
```

## Decision Tree

```text
Do all keys have TTLs set?
  YES -> Do you want eviction based on frequency of use?
           YES -> volatile-lfu
           NO  -> Do you want soonest-expiring first?
                    YES -> volatile-ttl
                    NO  -> volatile-lru
  NO  -> Can Redis evict ANY key?
           YES -> Do you want frequency-based eviction?
                    YES -> allkeys-lfu
                    NO  -> allkeys-lru
           NO  -> noeviction (Redis returns errors when full)
```

## Caching (Pure Cache - No Persistent Data)

For a Redis instance used exclusively as a cache where all keys can be evicted:

```bash
CONFIG SET maxmemory-policy allkeys-lru
# or
CONFIG SET maxmemory-policy allkeys-lfu
```

`allkeys-lru` is the most common choice - it evicts the least recently used key across all keys. `allkeys-lfu` is better when you have viral spikes and want to protect frequently accessed (but not recently accessed) data.

## Mixed Cache and Persistent Data

When some keys must not be evicted (e.g., session data stored without TTL, persistent counters):

```bash
# Only evict keys that have an expiry set
CONFIG SET maxmemory-policy volatile-lru

# Mark cache keys with TTL, leave persistent keys without TTL
SET cache:product:99 "..." EX 3600    # Can be evicted
SET counter:global 0                   # Cannot be evicted (no TTL)
```

## Leaky Buckets and Rate Limiters

For rate limiting counters set with precise TTLs:

```bash
CONFIG SET maxmemory-policy volatile-ttl
# Redis evicts keys whose TTL is closest to expiring - these are the least valuable
```

## Job Queues and Primary Datastores

If Redis stores data that cannot be lost:

```bash
CONFIG SET maxmemory-policy noeviction
# Redis returns OOM errors instead of silently dropping data
# Application must handle the error and backpressure
```

## Monitoring Evictions

```bash
redis-cli INFO stats | grep evicted_keys
# evicted_keys:12453

# Monitor evictions in real time
redis-cli --stat | grep evicted
```

```python
import redis

r = redis.Redis()

def check_evictions():
    info = r.info("stats")
    evicted = info.get("evicted_keys", 0)
    if evicted > 0:
        print(f"WARNING: {evicted} keys have been evicted")
    return evicted
```

## Tuning maxmemory with the Policy

```bash
# Set a memory limit before enabling eviction
CONFIG SET maxmemory 4gb
CONFIG SET maxmemory-policy allkeys-lru

# LRU/LFU sample size (higher = more accurate, more CPU)
CONFIG SET maxmemory-samples 10
```

The `maxmemory-samples` setting controls how many random keys Redis samples when approximating LRU/LFU. The default is 5; raising it to 10 improves eviction accuracy at a small CPU cost.

## Summary

Choose `allkeys-lru` for pure caches where any key can be evicted, `volatile-lru` when mixing persistent and cache data, `volatile-ttl` for rate limiters and short-lived keys, and `noeviction` for datastores that cannot lose data. Always set `maxmemory` before enabling eviction policies, and monitor `evicted_keys` to confirm the policy is working as expected.
