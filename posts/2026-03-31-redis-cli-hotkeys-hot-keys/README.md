# How to Use Redis CLI --hotkeys for Finding Hot Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLI, Hot Key, Performance, Monitoring

Description: Learn how to use redis-cli --hotkeys to detect the most frequently accessed keys in Redis, helping you identify cache hotspots and distribution problems.

---

A hot key is a Redis key that receives a disproportionate number of read or write operations. Hot keys cause uneven load distribution, can exhaust a single Redis instance, and degrade performance for all other keys on that instance. The `--hotkeys` flag identifies them.

## Prerequisite: Enable LFU Eviction

`--hotkeys` requires the LFU (Least Frequently Used) eviction policy to be active. LFU tracks access frequency per key.

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
```

Or set it permanently in `redis.conf`:

```text
maxmemory-policy allkeys-lfu
```

Without LFU, you get an error:

```text
Error: ERR object freq is not allowed when maxmemory-policy is not set to an LFU policy.
```

## Running --hotkeys

```bash
redis-cli --hotkeys
```

Output:

```text
# Scanning the entire keyspace to find hot keys as well as
# average number of accesses per key type.

[00.00%] Hot key '"session:abc123"' found so far with counter 255
[33.20%] Hot key '"config:global"' found so far with counter 198
[66.40%] Hot key '"rate:limit:user:99"' found so far with counter 142

-------- summary -------

Sampled 500000 keys in the keyspace!

Hot key '"session:abc123"' has counter 255
Hot key '"config:global"' has counter 198
Hot key '"rate:limit:user:99"' has counter 142
```

## Adding Rate Limiting During Scan

```bash
redis-cli --hotkeys -i 0.1
```

## Interpreting the Counter

The counter is the LFU access frequency approximation, not the exact number of reads. It uses a logarithmic counter that decays over time. A higher value means more recent and frequent access.

## What to Do with Hot Keys

### Read Replicas

If the hot key is read-heavy, direct reads to replicas:

```bash
# Application layer: route reads to replica
READONLY  # sent to replica before GET
GET session:abc123
```

### Local In-Memory Caching

Cache the hot key in the application process memory:

```python
import time

_local_cache = {}
_local_cache_ttl = {}

def get_with_local_cache(r, key, ttl=5):
    now = time.time()
    if key in _local_cache and _local_cache_ttl[key] > now:
        return _local_cache[key]
    value = r.get(key)
    _local_cache[key] = value
    _local_cache_ttl[key] = now + ttl
    return value
```

### Key Sharding

For write-heavy hot keys, shard them across multiple keys:

```python
import random

def increment_counter(r, base_key, num_shards=10):
    shard = random.randint(0, num_shards - 1)
    r.incr(f"{base_key}:shard:{shard}")

def get_total_counter(r, base_key, num_shards=10):
    keys = [f"{base_key}:shard:{i}" for i in range(num_shards)]
    values = r.mget(keys)
    return sum(int(v) for v in values if v)
```

## Checking a Specific Key's Frequency

```bash
redis-cli OBJECT FREQ session:abc123
# (integer) 255
```

## Summary

`redis-cli --hotkeys` scans your keyspace using LFU counters to identify the most frequently accessed keys. Requires an LFU eviction policy. Use the results to implement read replicas, local in-memory caches, or key sharding to distribute load away from hot key bottlenecks.
