# How to Troubleshoot Redis Key Eviction Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Eviction, Memory, Troubleshooting, Cache

Description: Diagnose unexpected Redis key evictions by examining eviction policies, maxmemory settings, and key TTL patterns to protect critical data.

---

## Understanding Redis Key Eviction

When Redis reaches its `maxmemory` limit, it evicts keys according to the configured `maxmemory-policy`. Evictions are a normal part of using Redis as a cache, but unexpected evictions of important data indicate misconfiguration.

Common symptoms of eviction problems:

- Cache miss rates suddenly spike
- Keys disappear unexpectedly without expiry
- Application errors from missing required keys
- `evicted_keys` counter growing rapidly

## Step 1 - Check Eviction Stats

```bash
redis-cli INFO stats | grep -E 'evicted_keys|expired_keys|keyspace_hits|keyspace_misses'
```

Key metrics:

```text
evicted_keys:12345        # Total keys evicted by maxmemory policy
expired_keys:67890        # Total keys expired by TTL
keyspace_hits:1000000
keyspace_misses:50000     # High misses may indicate evictions of needed data
```

Monitor the eviction rate over time by polling the `evicted_keys` metric:

```bash
redis-cli INFO stats | grep evicted_keys
```

## Step 2 - Check Current Eviction Policy

```bash
redis-cli CONFIG GET maxmemory-policy
redis-cli CONFIG GET maxmemory
```

Available policies and their behaviour:

| Policy | Description |
|---|---|
| noeviction | Return error, no eviction |
| allkeys-lru | Evict LRU key from all keys |
| volatile-lru | Evict LRU key with TTL only |
| allkeys-lfu | Evict LFU key from all keys |
| volatile-lfu | Evict LFU key with TTL only |
| allkeys-random | Random eviction from all keys |
| volatile-random | Random eviction from keys with TTL |
| volatile-ttl | Evict key with soonest TTL |

## Step 3 - Protect Critical Keys from Eviction

If you have keys that must never be evicted, use `volatile-*` policies and only set TTLs on cache keys (not on critical data keys). Without a TTL, keys are not eligible for eviction under volatile policies.

```bash
# Cache key - eligible for eviction
SET cache:user:123 "{...}" EX 3600

# Critical key - no TTL, not evicted under volatile-lru
SET config:app:settings "{...}"
```

## Step 4 - Investigate Which Keys Are Being Evicted

Redis does not natively log which specific keys were evicted. Use keyspace notifications to track evictions:

```bash
redis-cli CONFIG SET notify-keyspace-events "Ee"
```

In a subscriber:

```bash
redis-cli PSUBSCRIBE '__keyevent@0__:evicted'
```

This will print the name of each evicted key to the subscriber. Use this temporarily to identify which keys are being lost.

## Step 5 - Check LFU Configuration

If using LFU (Least Frequently Used) policies, tune the LFU decay factor:

```bash
redis-cli CONFIG GET lfu-decay-time
redis-cli CONFIG GET lfu-log-factor
```

`lfu-decay-time` (default 1) is the number of minutes between LFU counter decay. Lower values decay counters faster. `lfu-log-factor` (default 10) controls how quickly LFU counters are saturated.

Check a key's LFU frequency:

```bash
redis-cli OBJECT FREQ mykey
```

## Step 6 - Adjust maxmemory-samples

Redis LRU and LFU are approximate algorithms that sample a set of keys. Increase `maxmemory-samples` for better accuracy at the cost of CPU:

```bash
redis-cli CONFIG GET maxmemory-samples
# Default is 5

redis-cli CONFIG SET maxmemory-samples 10
```

## Step 7 - Separate Cache and Persistent Data

The best long-term fix for protecting critical keys from eviction is to run separate Redis instances: one as a cache (with `allkeys-lru` and a maxmemory limit) and one for persistent data (with `noeviction` and adequate memory).

```text
# Cache instance - redis-cache.conf
maxmemory 4gb
maxmemory-policy allkeys-lru
save ""
appendonly no

# Persistent instance - redis-persistent.conf
maxmemory 0
maxmemory-policy noeviction
appendonly yes
```

## Step 8 - Monitor Memory Pressure

Set up alerts when memory usage exceeds a threshold:

```python
import redis

r = redis.Redis(host='localhost', port=6379)
info = r.info('memory')

used = info['used_memory']
maxmem = info['maxmemory']

if maxmem > 0:
    utilization = used / maxmem
    if utilization > 0.85:
        print(f"WARNING: Redis memory at {utilization:.1%} - evictions may occur")
```

## Summary

Redis key eviction problems are usually caused by running critical data alongside cache data under a single maxmemory policy. Monitor `evicted_keys` and `keyspace_misses` metrics to detect unwanted evictions, use keyspace notifications to identify specific evicted keys, and protect critical data by either using volatile policies with TTL only on expendable keys, or separating cache and persistent data into different Redis instances.
