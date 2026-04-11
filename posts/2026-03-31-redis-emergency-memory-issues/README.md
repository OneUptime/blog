# How to Handle Redis Emergency Memory Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Incident Response

Description: Learn how to diagnose and resolve Redis emergency memory issues, including OOM prevention, eviction configuration, and large key identification under pressure.

---

Redis memory emergencies - when your instance approaches or hits `maxmemory` - can cause write failures, evictions, or complete unresponsiveness. This guide provides an emergency response playbook for memory crises.

## Detecting the Emergency

```bash
# Check memory pressure immediately
redis-cli INFO memory | grep -E "used_memory_human:|maxmemory_human:|mem_fragmentation_ratio:|maxmemory_policy:"

# Check if evictions are happening
redis-cli INFO stats | grep evicted_keys

# Check for OOM errors in logs
tail -100 /var/log/redis/redis.log | grep -i "oom\|out of memory\|maxmemory"
```

Warning signs:

```text
used_memory approaching maxmemory    -> near OOM
mem_fragmentation_ratio > 1.5        -> high fragmentation
evicted_keys increasing              -> eviction policy active
maxmemory_policy: noeviction + full  -> writes will start failing
```

## Immediate Relief Actions

**Action 1: Enable eviction to stop write failures**

```bash
# If maxmemory-policy is noeviction and you're at capacity
redis-cli CONFIG SET maxmemory-policy allkeys-lru
# Now Redis will evict LRU keys instead of returning errors
```

**Action 2: Delete known large or temporary keys**

```bash
# Find big keys fast (non-blocking scan)
redis-cli --bigkeys --i 0.1  # 0.1s sleep between iterations

# Delete specific large key
redis-cli UNLINK large-key-name  # UNLINK is async, safer than DEL
```

**Action 3: Flush a specific database if safe**

```bash
# Check which DB has the most keys
redis-cli INFO keyspace

# Flush only if it's safe (e.g., a temporary cache database)
redis-cli -n 3 FLUSHDB ASYNC
```

## Finding Memory Hogs

```bash
# Sample keyspace for large keys
redis-cli --scan --count 1000 | head -500 | while read key; do
  size=$(redis-cli MEMORY USAGE "$key" 2>/dev/null)
  echo "$size $key"
done | sort -rn | head -20
```

```bash
# Check key patterns
redis-cli --scan | sed 's/:[^:]*$//' | sort | uniq -c | sort -rn | head -20
```

## Defragmentation

High fragmentation wastes memory without adding data:

```bash
# Check fragmentation
redis-cli INFO memory | grep mem_fragmentation_ratio
# ratio > 1.5 means significant fragmentation

# Enable active defragmentation (online, non-blocking)
redis-cli CONFIG SET activedefrag yes
redis-cli CONFIG SET active-defrag-threshold-lower 10
redis-cli CONFIG SET active-defrag-threshold-upper 100

# Monitor defrag progress
redis-cli INFO memory | grep active_defrag
```

## Increase maxmemory as Emergency Fix

```bash
# Temporarily increase limit while you investigate
redis-cli CONFIG SET maxmemory 10gb
redis-cli CONFIG REWRITE  # persist if appropriate

# Alert your team about the emergency increase
echo "$(date) EMERGENCY: maxmemory increased to 10gb on $(hostname)" | mail -s "Redis Emergency" ops@company.com
```

## Post-Incident Analysis

```bash
# After stabilization, analyze what caused the spike
redis-cli INFO stats | grep -E "keyspace_hits:|keyspace_misses:|evicted_keys:"
redis-cli MEMORY DOCTOR
redis-cli SLOWLOG GET 20

# Review memory timeline from monitoring
# Look for: sudden key count increase, large value writes, memory leak in app
```

## Summary

Redis memory emergencies require immediate triage: check memory metrics, switch eviction policy if needed, identify and remove large keys using `--bigkeys` and `MEMORY USAGE`, and temporarily increase `maxmemory` as a bridge while you investigate root cause. Active defragmentation resolves fragmentation-induced waste without downtime.
