# How the allkeys-lfu Eviction Policy Works in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, LFU, Eviction, Cache, Memory

Description: Learn how Redis allkeys-lfu evicts the least frequently used keys across the entire keyspace, protecting popular items during traffic spikes better than LRU.

---

The `allkeys-lfu` eviction policy evicts the least frequently used key from the entire keyspace when Redis reaches its memory limit. Unlike LRU, which prioritizes recency, LFU tracks how often each key is accessed - making it better for workloads with long-lived popular keys.

## LFU vs LRU: The Core Difference

- **LRU** evicts the key not accessed for the longest time
- **LFU** evicts the key accessed the fewest times overall

Under LRU, a popular key that was not accessed in the last few seconds could be evicted during a traffic spike. LFU protects it because its access count is high.

```text
Key access history:
  product:bestseller  -> accessed 10,000 times (popular)
  product:new_item    -> accessed 3 times (just added)

Under LRU: "product:bestseller" might be evicted if not accessed recently
Under LFU: "product:new_item" is evicted (lower frequency)
```

## Configuration

```bash
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lfu

# LFU-specific tuning parameters
CONFIG SET lfu-log-factor 10       # Controls frequency counter growth rate
CONFIG SET lfu-decay-time 1        # Minutes before frequency decays
```

## LFU Counter Internals

Redis uses a probabilistic 8-bit counter per key (values 0-255). The counter does not increment on every access - instead it uses logarithmic increments based on `lfu-log-factor`:

```text
lfu-log-factor=10 (default):
  100 accesses   -> counter ~ 10
  1000 accesses  -> counter ~ 18
  100K accesses  -> counter ~ 142
  1M accesses    -> counter ~ 255
```

This logarithmic scaling allows the 8-bit counter to represent a very wide range of access frequencies without overflow.

## The Decay Mechanism

LFU counters decay over time based on `lfu-decay-time`. A key that was popular last week but is rarely accessed now will eventually have a lower counter than a currently popular key:

```bash
# Decay every 1 minute (default)
CONFIG SET lfu-decay-time 1

# No decay (pure lifetime frequency count)
CONFIG SET lfu-decay-time 0
```

## Inspecting LFU Counters

```bash
# Check a key's current LFU counter
OBJECT FREQ product:bestseller
# Returns: 255 (very frequently accessed)

OBJECT FREQ product:obscure_item
# Returns: 2 (rarely accessed)
```

```python
import redis

r = redis.Redis()
r.config_set("maxmemory-policy", "allkeys-lfu")

# Create keys first
r.set("hot_key", "value")
r.set("cold_key", "value")

# Simulate different access frequencies
for _ in range(1000):
    r.get("hot_key")

for _ in range(5):
    r.get("cold_key")

print("Hot key freq:", r.object("freq", "hot_key"))
print("Cold key freq:", r.object("freq", "cold_key"))
```

## When allkeys-lfu Outperforms allkeys-lru

`allkeys-lfu` is better than `allkeys-lru` in these scenarios:

1. **Flash sales / trending content**: A product that goes viral after being idle would be evicted by LRU but protected by LFU once it accumulates access counts
2. **Long-lived popular keys**: Keys that are always popular but have occasional idle periods survive better under LFU
3. **Skewed access patterns**: Zipf-distributed workloads where a small number of keys receive the vast majority of requests

```python
# Benchmark: simulate a skewed access pattern
import random

r.config_set("maxmemory", "10mb")
r.config_set("maxmemory-policy", "allkeys-lfu")

# 5% of keys receive 80% of traffic
hot_keys = [f"hot:{i}" for i in range(50)]
cold_keys = [f"cold:{i}" for i in range(950)]

for key in hot_keys + cold_keys:
    r.set(key, "x" * 100)

# Simulate traffic
for _ in range(10000):
    if random.random() < 0.8:
        r.get(random.choice(hot_keys))
    else:
        r.get(random.choice(cold_keys))

# Check hot key retention after adding more data to trigger eviction
for i in range(2000):
    r.set(f"new:{i}", "x" * 100)

retained = sum(1 for k in hot_keys if r.exists(k))
print(f"Hot keys retained: {retained}/{len(hot_keys)}")
```

## Tuning lfu-log-factor

```bash
# Lower factor = faster counter growth (distinguishes access counts better)
CONFIG SET lfu-log-factor 5

# Higher factor = slower counter growth (more stable, less sensitive to bursts)
CONFIG SET lfu-log-factor 20
```

## Summary

`allkeys-lfu` evicts the least frequently used key across the entire keyspace, protecting popular keys from eviction during traffic spikes. It uses a probabilistic 8-bit counter with logarithmic increments and time-based decay. Prefer `allkeys-lfu` over `allkeys-lru` when your workload has long-lived popular keys, skewed Zipf-like access patterns, or viral traffic spikes that temporarily boost new items.
