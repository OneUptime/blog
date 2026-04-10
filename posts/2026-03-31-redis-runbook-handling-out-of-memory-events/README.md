# Redis Runbook: Handling Out of Memory Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Runbook, Memory

Description: Step-by-step runbook for responding to Redis out-of-memory events - from immediate triage to root cause analysis and prevention.

---

When Redis hits its `maxmemory` limit, it either rejects writes or starts evicting keys depending on your eviction policy. This runbook walks through the steps to detect, respond to, and prevent OOM events.

## Step 1: Detect the Event

Check current memory usage:

```bash
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"
```

Check the current eviction policy (if set to `noeviction`, Redis will reject writes when memory is full):

```bash
redis-cli CONFIG GET maxmemory-policy
```

Review recent evictions:

```bash
redis-cli INFO stats | grep "evicted_keys"
```

## Step 2: Identify Top Memory Consumers

Scan for large keys:

```bash
redis-cli --bigkeys
```

Get key count and distribution:

```bash
redis-cli INFO keyspace
```

Use MEMORY USAGE on suspected large keys:

```bash
redis-cli MEMORY USAGE mybigkey SAMPLES 0
```

## Step 3: Immediate Mitigation

If you need to free memory quickly, delete large or stale keys. Use `UNLINK` instead of `DEL` to avoid blocking the server (UNLINK reclaims memory asynchronously in a background thread):

```bash
redis-cli UNLINK large-key-1 large-key-2
```

For many keys matching a pattern, use SCAN to avoid blocking:

```bash
redis-cli --scan --pattern "cache:session:*" | xargs redis-cli UNLINK
```

Increase maxmemory temporarily if headroom exists:

```bash
redis-cli CONFIG SET maxmemory 4gb
```

## Step 4: Adjust Eviction Policy

If keys should be evicted automatically, set an appropriate policy:

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

Common policies:
- `allkeys-lru` - evict least recently used keys
- `volatile-lru` - evict LRU keys with TTLs only
- `allkeys-lfu` - evict least frequently used keys

## Step 5: Persist the Configuration

After confirming stability, update `redis.conf` to persist the changes:

```bash
# redis.conf
maxmemory 4gb
maxmemory-policy allkeys-lru
```

## Step 6: Root Cause Analysis

Check if memory fragmentation is the issue:

```bash
redis-cli INFO memory | grep "mem_fragmentation_ratio"
```

A ratio above 1.5 indicates fragmentation. Enable active defragmentation:

```bash
redis-cli CONFIG SET activedefrag yes
```

Check for memory-intensive data structures. Large sorted sets, hashes, and lists can consume unexpected amounts:

```bash
redis-cli MEMORY DOCTOR
```

## Step 7: Set Up Alerting

Use a monitoring tool to alert before hitting maxmemory. Set an alert at 80% usage:

```yaml
# Prometheus alert example
- alert: RedisMemoryHigh
  expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
  for: 5m
```

## Summary

Handling Redis OOM events requires quick detection, targeted key deletion or eviction policy adjustment, and root cause analysis of memory growth. Proactive monitoring and TTL hygiene on cached keys prevent most OOM incidents before they impact production.
