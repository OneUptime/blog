# How Redis LRU and LFU Eviction Algorithms Work Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, LRU, LFU, Eviction, Memory Management, Internal

Description: Understand how Redis implements approximate LRU and exact LFU eviction algorithms using clock bits and frequency counters to free memory when maxmemory is reached.

---

## Why Redis Uses Approximate LRU

True LRU requires tracking every key access in an ordered data structure, which is expensive in both memory and CPU. Redis uses an approximation instead:

- Each key has a 24-bit LRU clock value
- When eviction is needed, Redis samples N random keys and evicts the least recently used
- The sample size `maxmemory-samples` (default: 5) controls accuracy vs CPU tradeoff

## The LRU Clock

Redis maintains a global LRU clock that updates every 1000ms (1 second resolution):

```c
// From redis/src/server.h
#define LRU_CLOCK_MAX ((1<<24)-1)  // 16777215 seconds (~194 days)
#define LRU_CLOCK_RESOLUTION 1000  // Milliseconds per LRU clock tick

// Global clock updated by server main loop
unsigned int LRU_CLOCK(void) {
    return (mstime()/LRU_CLOCK_RESOLUTION) & LRU_CLOCK_MAX;
}
```

Each `redisObject` stores its last access time in 24 bits:

```c
typedef struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    unsigned lru:24;    // LRU time or LFU data
    int refcount;
    void *ptr;
} robj;
```

## LRU Eviction Process

When Redis needs to free memory:

```text
1. Check if used memory > maxmemory
2. If yes, run eviction:
   a. Sample maxmemory-samples keys from the keyspace (or volatile keys)
   b. Find the key with the oldest lru clock value
   c. Delete that key
   d. Repeat until memory is below maxmemory
```

```bash
# Configure maxmemory and LRU eviction
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory-samples 10  # Higher = more accurate LRU, more CPU
```

## The Eviction Pool Optimization

Redis maintains an eviction candidate pool of 16 keys across multiple eviction rounds:

```text
Round 1: Sample 5 keys -> add to pool -> evict worst from pool
Round 2: Sample 5 more -> merge with pool, keep worst 16 -> evict worst
...

This means Redis effectively evaluates up to 16 * N candidates
over time, even with maxmemory-samples=5
```

## LFU (Least Frequently Used) - Redis 4.0+

LFU tracks how often keys are accessed, not just when they were last accessed. In Redis, the 24-bit LRU field is reused for LFU storage:

```c
// LFU field layout (24 bits):
// [16 bits: ldt] [8 bits: counter]
// ldt = last decrement time (in minutes, not seconds)
// counter = logarithmic access counter (0-255)
```

## LFU Counter Algorithm

Redis uses a logarithmic counter (Morris counter) that probabilistically increments:

```c
uint8_t LFULogIncr(uint8_t counter) {
    if (counter == 255) return 255;
    double r = (double)rand()/RAND_MAX;
    double baseval = counter - LFU_INIT_VAL;
    if (baseval < 0) baseval = 0;
    double p = 1.0/(baseval*server.lfu_log_factor+1);
    if (r < p) counter++;
    return counter;
}
```

Effectively:
- Counter increments faster for low-frequency keys
- Counter increments slower as frequency grows
- Maximum value: 255 (saturates at very high frequency)

## LFU Counter Decay

Without decay, a key accessed frequently in the past would never be evicted. Redis decays the counter over time:

```bash
# How many minutes per counter decrement (default: 1)
redis-cli CONFIG GET lfu-decay-time
# 1 (decrement counter by 1 every 1 minute of inactivity)

# lfu-log-factor: how fast counter increments (default: 10)
redis-cli CONFIG GET lfu-log-factor
# 10 (higher = slower increment = less differentiation between frequencies)
```

```text
LFU counter decay example (lfu-decay-time=1):
Time 0: access key 1000 times -> counter ~25 (log scale), ldt=0
Time 5 minutes: no access -> elapsed=5, counter = 25 - 5 = 20
Time 10 minutes: no access -> elapsed=10, counter = 25 - 10 = 15
...eventually evictable

Note: Redis always computes decay from the stored last-decrement-time (ldt),
not incrementally from the last evaluated value.
```

## Enabling LFU Eviction

```bash
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
# or
redis-cli CONFIG SET maxmemory-policy volatile-lfu

# Tune the log factor
redis-cli CONFIG SET lfu-log-factor 10

# Tune decay time (minutes per decrement)
redis-cli CONFIG SET lfu-decay-time 1
```

## Checking LFU Frequency

```bash
# View approximate access frequency for a key
redis-cli OBJECT FREQ mykey
# Returns: 12 (logarithmic counter value, not actual access count)

# This only works with LFU policy active
redis-cli CONFIG SET maxmemory-policy allkeys-lfu
redis-cli SET testkey "hello"
redis-cli GET testkey  # Access it multiple times
redis-cli OBJECT FREQ testkey
```

## LRU vs LFU Comparison

```text
LRU (Least Recently Used):
- Evicts keys that haven't been accessed recently
- Good for temporal locality patterns (recent = relevant)
- Vulnerable to scan operations that pollute the cache
- 24-bit clock, 1-second resolution

LFU (Least Frequently Used):
- Evicts keys accessed least often overall
- Better for stable working sets where frequency matters
- More resistant to cache pollution from scans
- Logarithmic counter with decay (probabilistic)
```

## Monitoring Evictions

```bash
redis-cli INFO stats | grep evicted_keys

# Watch eviction rate
watch -n 1 'redis-cli INFO stats | grep evicted_keys'

# Keyspace misses (may indicate eviction-related issues)
redis-cli INFO stats | grep keyspace_misses
```

## Summary

Redis LRU eviction uses a 24-bit clock timestamp per key and samples a configurable number of random keys to approximate true LRU without the overhead of a true LRU queue. Redis LFU (Redis 4.0+) reuses the same 24 bits for a logarithmic access counter with time-based decay, enabling smarter eviction that considers long-term usage frequency rather than recency. For most caching workloads, `allkeys-lru` with `maxmemory-samples 10` provides excellent eviction accuracy. Use LFU for workloads with stable hot sets that benefit from frequency-based retention.
