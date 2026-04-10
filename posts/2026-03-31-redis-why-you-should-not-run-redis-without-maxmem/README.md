# Why You Should Not Run Redis Without maxmemory Setting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory Management, maxmemory, Configuration, Production, Best Practice

Description: Learn why running Redis without a maxmemory limit is dangerous in production and how to set memory limits and eviction policies correctly.

---

## The Default Behavior: No Limit

By default, Redis has no memory limit. It will consume as much RAM as the server has available:

```bash
# Check current maxmemory setting
redis-cli CONFIG GET maxmemory
# 1) "maxmemory"
# 2) "0"   <-- 0 means unlimited
```

This means Redis will grow indefinitely until the server runs out of memory.

## What Happens Without maxmemory

### The OS OOM Killer Steps In

When a Linux server runs out of memory, the kernel's Out-Of-Memory killer selects a process to terminate. Redis - holding large amounts of memory - is a prime candidate:

```bash
# You'll see this in system logs:
dmesg | grep -i "oom"
# [1234567.890] Out of memory: Kill process 12345 (redis-server) score 900
```

This causes an immediate unplanned outage, potentially with data loss.

### Memory Competition with Other Processes

Without a limit, Redis can starve the OS, other applications, and the Redis process itself:

```text
Server RAM: 8GB
Redis usage (no limit): 7.5GB
OS + other apps: 0.5GB remaining
Result: System instability, swap thrashing, eventual crash
```

### Swap Usage Destroys Performance

When Redis starts using swap space, latency jumps from microseconds to milliseconds:

```bash
# Check if Redis is swapping (compare used_memory vs RSS)
redis-cli INFO memory | grep used_memory_human
redis-cli INFO memory | grep used_memory_rss_human

# Check system swap
free -m
# If swap used > 0 and Redis memory is high, you have a problem
```

## Setting maxmemory Correctly

Leave headroom for the OS, Redis internal operations, and forks during RDB saves:

```bash
# Set to 75% of available RAM for a dedicated Redis server
redis-cli CONFIG SET maxmemory 6gb

# Or in redis.conf
maxmemory 6gb
```

For shared servers:

```bash
# If server has 8GB and Redis is one of several services
maxmemory 2gb
```

## Choosing an Eviction Policy

Once maxmemory is set, you must also configure what happens when Redis is full:

```bash
# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

Available policies:

```text
Policy              Behavior
------              --------
noeviction          Return errors when memory is full (default)
allkeys-lru         Evict least recently used keys from all keys
volatile-lru        Evict LRU keys only from keys with TTL set
allkeys-lfu         Evict least frequently used keys from all
volatile-lfu        Evict LFU keys only from keys with TTL set
allkeys-random      Evict random keys from all
volatile-random     Evict random keys from those with TTL set
volatile-ttl        Evict keys with shortest TTL first
```

## Policy Selection Guide

```text
Use case                        Recommended policy
--------                        ------------------
Cache (all keys rebuildable)    allkeys-lru or allkeys-lfu
Cache (only cached items)       volatile-lru
Session store                   volatile-ttl or noeviction
Queue / data store              noeviction (with alerts)
Mixed workload                  allkeys-lru
```

## Configuring in redis.conf

```text
# Set memory limit
maxmemory 4gb

# Set eviction policy
maxmemory-policy allkeys-lru

# Number of samples for LRU approximation (higher = more accurate)
maxmemory-samples 10
```

## Monitoring Memory Usage

```bash
# Check memory stats
redis-cli INFO memory

# Key fields to watch:
# used_memory_human    - Memory used by data
# used_memory_rss_human - Memory seen by OS (includes fragmentation)
# maxmemory_human      - Your configured limit
# mem_fragmentation_ratio - Should be between 1.0-1.5

# Monitor evictions
redis-cli INFO stats | grep evicted_keys
```

## Setting Up Alerts

```bash
# Alert when memory exceeds 80% of maxmemory
redis-cli INFO memory | grep used_memory:
# Compare used_memory to maxmemory

# Script to check percentage
python3 -c "
import redis
r = redis.Redis()
info = r.info('memory')
used = info['used_memory']
maxmem = info['maxmemory']
if maxmem > 0:
    pct = (used / maxmem) * 100
    print(f'Memory usage: {pct:.1f}%')
    if pct > 80:
        print('WARNING: Redis memory above 80% threshold')
"
```

## Summary

Running Redis without maxmemory is a production risk that can lead to OOM kills, system instability, and unplanned outages. Always set maxmemory to 60-75% of available RAM and choose an eviction policy that matches your workload. For caches, use allkeys-lru. For data stores where data loss is unacceptable, use noeviction with proactive memory monitoring and alerts.
