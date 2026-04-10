# How to Tune Redis for High-Memory Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Memory, Tuning, Configuration

Description: Learn how to configure Redis for workloads with large datasets, including eviction policies, memory limits, encoding thresholds, and fragmentation management.

---

When Redis is holding gigabytes of data, the default configuration leaves significant memory efficiency on the table. Tuning memory-related settings reduces RSS usage, prevents OOM errors, and keeps eviction working correctly.

## Set Memory Limits and Eviction Policy

Always set a `maxmemory` limit to prevent Redis from consuming all available RAM:

```text
# /etc/redis/redis.conf
maxmemory 12gb
maxmemory-policy allkeys-lru
```

Common eviction policies:

| Policy | When to Use |
|---|---|
| `allkeys-lru` | General cache - evict least recently used keys |
| `allkeys-lfu` | Workloads with hot/cold data patterns |
| `volatile-lru` | Only evict keys with TTL set |
| `noeviction` | Databases where data must not be lost |

## Enable Active Defragmentation

Large datasets develop memory fragmentation over time:

```text
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
active-defrag-threshold-upper 100
active-defrag-cycle-min 1
active-defrag-cycle-max 25
```

## Tune Hash Encoding Thresholds

Small hashes use a compact `listpack` encoding by default. Raise thresholds to keep more data in compact form:

```text
hash-max-listpack-entries 256
hash-max-listpack-value 64
```

Check how many hashes are using which encoding:

```bash
redis-cli OBJECT ENCODING myhashkey
```

## Compress Sorted Sets and Lists

```text
zset-max-listpack-entries 256
zset-max-listpack-value 64
list-max-listpack-size -2
list-compress-depth 1
```

`list-compress-depth 1` compresses all list nodes except the first and last, saving memory for long lists.

## Lazy-Free Large Deletions

Deleting large keys synchronously blocks Redis. Use lazy-free:

```text
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes
```

## Monitor Memory Metrics

```bash
redis-cli INFO memory
```

Key fields to watch:

```text
used_memory_human: 8.50G
used_memory_rss_human: 10.20G
mem_fragmentation_ratio: 1.20
maxmemory_human: 12.00G
maxmemory_policy: allkeys-lru
```

A fragmentation ratio above 1.5 indicates significant waste - enable active defragmentation.

## Use MEMORY USAGE to Identify Large Keys

```bash
redis-cli MEMORY USAGE bigkey
redis-cli --bigkeys
```

## Summary

Tune Redis for high-memory workloads by setting `maxmemory` with an appropriate eviction policy, enabling active defragmentation, raising compact encoding thresholds for hashes and sorted sets, and enabling lazy-free deletion. Monitor `mem_fragmentation_ratio` regularly and act when it exceeds 1.5.
