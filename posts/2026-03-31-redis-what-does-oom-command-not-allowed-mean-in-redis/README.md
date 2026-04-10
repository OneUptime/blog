# What Does 'OOM command not allowed' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, OOM, Memory, maxmemory, Troubleshooting

Description: Understand why Redis returns 'OOM command not allowed when used memory is greater than maxmemory' and how to fix it with proper memory policies and configuration.

---

## What Is the OOM Error

When Redis has a `maxmemory` limit configured and the instance is at or above that limit, write commands that would increase memory usage return:

```text
(error) OOM command not allowed when used memory > 'maxmemory'.
```

OOM stands for Out Of Memory. Redis enforces this limit to prevent unbounded memory growth that would cause the OS to kill the process or exhaust system RAM.

## When Does This Happen

Redis returns OOM errors when:

1. `maxmemory` is set to a non-zero value in `redis.conf` or via `CONFIG SET`
2. Used memory has reached or exceeded `maxmemory`
3. The `maxmemory-policy` is set to `noeviction` (the default)

With `noeviction`, Redis accepts read commands but rejects write commands that would add new data. With eviction policies like `allkeys-lru`, Redis evicts existing keys to make room instead of returning errors.

## How to Diagnose

### Check Memory Usage

```bash
redis-cli INFO memory
```

Key fields:

```text
used_memory:1073741824
used_memory_human:1.00G
used_memory_rss:1200000000
used_memory_peak:1073741824
maxmemory:1073741824
maxmemory_human:1.00G
maxmemory_policy:noeviction
mem_fragmentation_ratio:1.12
```

If `used_memory` equals `maxmemory`, Redis is at its limit.

### Check the Eviction Policy

```bash
redis-cli CONFIG GET maxmemory-policy
```

If the result is `noeviction`, Redis will return OOM errors instead of evicting keys.

## How to Fix

### Option 1 - Increase maxmemory

If you have available RAM, increase the limit:

```bash
# Set at runtime
redis-cli CONFIG SET maxmemory 2gb

# Persist in redis.conf
maxmemory 2gb
```

Use units: `kb`, `mb`, `gb` (or `k`, `m`, `g` for SI units), or specify the value in bytes without a suffix. Leave some headroom for RSS overhead (typically 10-20% above logical memory).

### Option 2 - Change the Eviction Policy

For cache workloads, use an eviction policy that removes old keys instead of rejecting writes:

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

Available policies:

| Policy | Behavior |
|--------|----------|
| `noeviction` | Reject writes when memory full |
| `allkeys-lru` | Evict least recently used keys from all keys |
| `volatile-lru` | Evict LRU keys with TTL set |
| `allkeys-lfu` | Evict least frequently used keys |
| `volatile-lfu` | Evict LFU keys with TTL set |
| `allkeys-random` | Evict random keys |
| `volatile-random` | Evict random keys with TTL |
| `volatile-ttl` | Evict keys closest to expiry |

For a cache: use `allkeys-lru` or `allkeys-lfu`.
For a database: use `volatile-lru` so only keys with TTLs are candidates.
For message queues or critical data: use `noeviction` and alert before hitting the limit.

### Option 3 - Reduce Memory Usage

Delete keys that are no longer needed:

```bash
# Find large keys
redis-cli --bigkeys

# Delete specific keys
redis-cli DEL large-key-1 large-key-2

# Delete by pattern (use SCAN, not KEYS in production)
redis-cli --scan --pattern "cache:old:*" | xargs redis-cli DEL
```

Check memory by key type:

```bash
redis-cli INFO keyspace
redis-cli OBJECT ENCODING some-key
redis-cli OBJECT IDLETIME some-key
```

### Option 4 - Enable Key Expiration

Add TTLs to keys that should not live indefinitely:

```bash
redis-cli EXPIRE session:abc123 3600
redis-cli EXPIRE cache:result:xyz 86400
```

In bulk via a script:

```python
import redis

r = redis.Redis()
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="cache:*", count=1000)
    for key in keys:
        if r.ttl(key) == -1:  # No TTL set
            r.expire(key, 3600)
    if cursor == 0:
        break
```

## Monitoring to Prevent OOM Errors

Set up alerts before reaching the limit:

```bash
# Prometheus alert
- alert: RedisNearMemoryLimit
  expr: redis_memory_used_bytes / redis_config_maxmemory > 0.85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Redis memory usage above 85% of maxmemory"
```

Monitor evictions to detect if the eviction policy is removing too much data:

```bash
redis-cli INFO stats | grep evicted_keys
```

## Summary

The "OOM command not allowed" error means Redis has hit its `maxmemory` limit and the `noeviction` policy is preventing new writes. Fix it by increasing `maxmemory` if RAM is available, switching to an LRU eviction policy for cache workloads, or reducing data size by adding TTLs and deleting unnecessary keys. Monitor memory usage and alert at 85% of `maxmemory` to avoid this error in production.
