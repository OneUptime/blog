# How to Monitor Redis Eviction Rate and Policy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Eviction, Monitoring, Operation

Description: Learn how to monitor Redis key eviction rates, understand the eight eviction policies, and configure the right policy for your cache workload.

---

## What Is Key Eviction

When Redis reaches its `maxmemory` limit, it must remove keys to make room for new data. The eviction policy determines which keys are removed. Without proper monitoring, eviction can silently degrade application behavior - cache misses spike and performance degrades.

## Setting maxmemory

```bash
# Set max memory to 4GB
redis-cli CONFIG SET maxmemory 4gb

# Check current setting
redis-cli CONFIG GET maxmemory
```

In `redis.conf`:
```text
maxmemory 4gb
maxmemory-policy allkeys-lru
```

## The Ten Eviction Policies

| Policy | Description | Use Case |
|--------|-------------|----------|
| `noeviction` | Return error when memory full | Databases, critical data |
| `allkeys-lru` | Evict least recently used key | General cache |
| `volatile-lru` | Evict LRU key with TTL set | Mixed cache+persistent data |
| `allkeys-lfu` | Evict least frequently used | Skewed access patterns |
| `volatile-lfu` | Evict LFU key with TTL set | Mixed with frequency bias |
| `allkeys-lrm` | Evict least recently modified key | Write-heavy caches |
| `volatile-lrm` | Evict LRM key with TTL set | Mixed with modification bias |
| `allkeys-random` | Evict random key | Uniform access patterns |
| `volatile-random` | Evict random key with TTL | Random cache invalidation |
| `volatile-ttl` | Evict key with shortest TTL | Shortest-lived keys first |

## Checking Current Policy

```bash
redis-cli CONFIG GET maxmemory-policy
```

```text
1) "maxmemory-policy"
2) "allkeys-lru"
```

## Monitoring Eviction Rate

```bash
redis-cli INFO stats | grep evicted
```

```text
evicted_keys:4823
```

This is cumulative since startup. To get the rate:
```bash
# Sample twice with a 1-second gap
a=$(redis-cli INFO stats | grep evicted_keys | cut -d: -f2 | tr -d '\r')
sleep 1
b=$(redis-cli INFO stats | grep evicted_keys | cut -d: -f2 | tr -d '\r')
echo "Eviction rate: $((b - a)) keys/sec"
```

## Monitoring with a Python Script

```python
import redis
import time

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

prev_evicted = None
prev_time = None

while True:
    info = r.info('all')
    now = time.time()
    evicted = info['evicted_keys']
    used_memory_pct = info['used_memory'] / info['maxmemory'] * 100 if info['maxmemory'] > 0 else 0
    policy = info['maxmemory_policy']

    if prev_evicted is not None:
        rate = (evicted - prev_evicted) / (now - prev_time)
        print(f"Policy: {policy} | Memory: {used_memory_pct:.1f}% | Evictions: {rate:.1f}/s")

        if rate > 100:
            print("WARNING: High eviction rate! Consider increasing maxmemory or reviewing access patterns.")

    prev_evicted = evicted
    prev_time = now
    time.sleep(5)
```

## Checking Eviction Policy Effectiveness

Use the `OBJECT FREQ` command (for LFU policies) to see access frequency:
```bash
# Only available when using LFU policies
redis-cli OBJECT FREQ user:1001
# -> (integer) 148  (higher = more frequently accessed)
```

Check LRU clock (for LRU policies):
```bash
redis-cli OBJECT IDLETIME user:1001
# -> (integer) 42  (seconds since last access)
```

## Choosing the Right Policy

**Use `allkeys-lru`** when:
- All keys are cache entries (no persistent data)
- Access patterns follow a power-law distribution (some keys much hotter than others)

**Use `allkeys-lfu`** when:
- You have bursty access patterns where recent != frequent
- You want to protect long-lived popular items from being evicted by a brief spike in new keys

**Use `volatile-lru` or `volatile-lfu`** when:
- Some keys are persistent (no TTL) and must not be evicted
- Cache entries have TTLs set

**Use `noeviction`** when:
- Redis is a primary data store (not a cache)
- You need applications to fail fast rather than silently lose data

**Use `volatile-ttl`** when:
- You want keys closest to expiration to be evicted first

## Tuning LFU Decay

For LFU policies, configure the decay rate (how fast frequency counts decrease):
```text
# redis.conf
# Higher value = slower decay (longer memory)
lfu-decay-time 1

# Counter growth rate (higher = more accesses needed to reach max frequency)
lfu-log-factor 10
```

```bash
redis-cli CONFIG SET lfu-decay-time 1
redis-cli CONFIG SET lfu-log-factor 10
```

## Setting Eviction Alerts in Prometheus

If you use redis_exporter with Prometheus:
```yaml
# Prometheus alert rules
groups:
  - name: redis
    rules:
      - alert: RedisHighEvictionRate
        expr: rate(redis_evicted_keys_total[5m]) > 100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Redis evicting more than 100 keys/sec"

      - alert: RedisMemoryNearLimit
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage above 90%"
```

## Summary

Monitor Redis eviction through the `evicted_keys` counter in `INFO stats` and alert when the rate exceeds your acceptable threshold. Choose `allkeys-lru` for general-purpose caches and `allkeys-lfu` when access patterns are skewed. Set `maxmemory` to leave a 20-30% headroom below the system's available RAM to prevent swapping when eviction cannot keep up.
