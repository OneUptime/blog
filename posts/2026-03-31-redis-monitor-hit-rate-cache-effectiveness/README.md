# How to Monitor Redis Hit Rate and Cache Effectiveness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, Cache, Hit Rate, Performance

Description: Learn how to calculate Redis cache hit rate from INFO stats, interpret keyspace hits and misses, and improve cache effectiveness when hit rates drop.

---

Cache hit rate is the most direct measure of whether your Redis cache is actually working. A drop in hit rate means more requests are reaching your database, increasing latency and load.

## Calculate Hit Rate from INFO stats

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

```text
keyspace_hits:8472930
keyspace_misses:234819
```

Hit rate formula:

```text
hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses)
         = 8472930 / (8472930 + 234819)
         = 0.9731 = 97.3%
```

## Real-Time Hit Rate Monitoring

```python
import redis
import time

r = redis.Redis(host="127.0.0.1", port=6379)

def get_hit_rate():
    info = r.info("stats")
    hits = info["keyspace_hits"]
    misses = info["keyspace_misses"]
    total = hits + misses
    if total == 0:
        return 0.0
    return hits / total * 100

prev_hits = prev_misses = 0

while True:
    info = r.info("stats")
    hits = info["keyspace_hits"]
    misses = info["keyspace_misses"]

    # Delta since last sample (not cumulative)
    delta_hits = hits - prev_hits
    delta_misses = misses - prev_misses
    delta_total = delta_hits + delta_misses

    if delta_total > 0:
        rate = delta_hits / delta_total * 100
        print(f"Hit rate (last 5s): {rate:.1f}% | Hits: {delta_hits} | Misses: {delta_misses}")

    prev_hits, prev_misses = hits, misses
    time.sleep(5)
```

Using delta values gives you the current hit rate rather than the all-time average.

## What Hit Rate Targets to Aim For

| Scenario | Target Hit Rate |
|---|---|
| Session cache | > 99% |
| Page cache | > 90% |
| Query result cache | > 80% |
| Ephemeral computation cache | > 70% |

## Diagnose Low Hit Rate

**Cause 1: Keys expiring too quickly**

```bash
# Check TTL distribution
redis-cli INFO keyspace
```

```text
db0:keys=42857,expires=41200,avg_ttl=3542
```

High `expires/keys` ratio with short `avg_ttl` means keys are expiring before they're hit.

**Cause 2: Key namespace mismatch**

Your application might be writing to `user:123` but reading from `users:123`. Verify with `MONITOR`:

```bash
redis-cli MONITOR | grep -E "GET|SET" | head -50
```

**Cause 3: Cache size too small - eviction**

```bash
redis-cli INFO stats | grep evicted
```

Rising `evicted_keys` means cache is too small for your working set.

## Improve Hit Rate

```text
# Extend TTLs for popular keys
EXPIRE popular-key 86400

# Increase maxmemory to reduce eviction
CONFIG SET maxmemory 8gb

# Use LFU eviction to keep hot keys
CONFIG SET maxmemory-policy allkeys-lfu
```

## Summary

Calculate Redis cache hit rate using `keyspace_hits / (keyspace_hits + keyspace_misses)` from `INFO stats`. Monitor delta values (not cumulative) for real-time accuracy. A dropping hit rate indicates keys expiring too quickly, namespace bugs in cache key generation, or cache capacity too small for the working set. Switch to `allkeys-lfu` eviction to retain the most-used keys when memory is constrained.
