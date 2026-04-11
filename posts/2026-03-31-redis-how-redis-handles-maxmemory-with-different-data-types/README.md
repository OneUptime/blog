# How Redis Handles maxmemory with Different Data Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Data Type

Description: Learn how Redis maxmemory enforcement and eviction interact with different data types - strings, hashes, lists, sets, and sorted sets.

---

Redis maxmemory limits the total memory Redis can use. When that limit is reached and an eviction policy is set, Redis evicts keys to make room for new writes. However, the relationship between maxmemory and different data types has nuances worth understanding.

## How maxmemory Is Enforced

Redis checks memory usage before each write command. If usage is at or above `maxmemory`, it runs the eviction algorithm to free memory:

```bash
redis-cli CONFIG GET maxmemory
redis-cli CONFIG GET maxmemory-policy
redis-cli INFO memory | grep used_memory_human
```

## Memory Overhead by Data Type

Different data types have different memory characteristics. Redis uses compact encoding for small objects:

Check memory usage of a specific key:

```bash
redis-cli MEMORY USAGE mykey SAMPLES 10
redis-cli DEBUG OBJECT mykey
```

- Strings: stored inline if small (up to 44 bytes), otherwise heap-allocated
- Hashes: use listpack (formerly ziplist) encoding for small hashes (up to 128 fields by default)
- Lists: use quicklist encoding, which internally stores data in listpack nodes
- Sets: use intset for small integer-only sets, listpack for small sets (Redis 7.2+), hashtable for larger ones
- Sorted sets: use listpack for small ones, skiplist + hashtable for larger ones

## Eviction Units Are Keys, Not Fields

When Redis evicts under memory pressure, it evicts entire keys - not individual fields within a hash or elements within a list. This means a single large hash key may be evicting a lot of useful data at once.

For caching, prefer many small keys over few large keys so eviction is more granular:

```bash
# Less granular - one big hash evicted at once
HSET user-cache:all user1 data1 user2 data2 ...

# More granular - each user cached separately
SET user-cache:user1 data1
SET user-cache:user2 data2
```

## How Eviction Policies Apply to Different Types

All eviction policies apply to keys as a whole:

```bash
redis-cli CONFIG SET maxmemory-policy volatile-lru
```

- `volatile-lru` - evict among keys with TTLs using LRU
- `allkeys-lru` - evict any key using LRU
- `volatile-lfu` - evict among TTL keys using LFU
- `allkeys-lfu` - evict any key using LFU
- `allkeys-random` - evict random keys

## Compact Encoding Thresholds

When small data structures grow beyond their compact encoding thresholds, Redis converts them to a more memory-intensive representation, which can cause a sudden jump in memory usage:

```bash
redis-cli CONFIG GET hash-max-listpack-entries   # Default: 128
redis-cli CONFIG GET hash-max-listpack-value     # Default: 64 bytes
redis-cli CONFIG GET zset-max-listpack-entries   # Default: 128
```

Tuning these thresholds lets you trade memory for CPU in specific use cases.

## Monitoring Memory Per Data Type

Use MEMORY USAGE on a sample of keys from each type to understand where memory is going:

```bash
redis-cli --scan --pattern "*" | head -100 | while read key; do
  type=$(redis-cli TYPE "$key")
  mem=$(redis-cli MEMORY USAGE "$key" SAMPLES 0)
  echo "$type $mem $key"
done | sort -k2 -rn | head -20
```

## Summary

Redis maxmemory enforcement evicts entire keys regardless of data type. Compact encodings for small data structures (listpack, intset) reduce memory significantly. Choosing many small keys over few large ones improves eviction granularity. Monitoring encoding types and memory per key helps identify where memory is consumed.
