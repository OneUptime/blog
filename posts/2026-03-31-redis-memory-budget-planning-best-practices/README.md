# Redis Memory Budget Planning Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Planning, Best Practice, Production

Description: Learn how to plan and manage your Redis memory budget - covering sizing, overhead accounting, monitoring, and preventing OOM errors in production deployments.

---

Running out of Redis memory in production causes evictions, OOM errors, or even data loss. Proper memory budget planning avoids these situations by sizing your Redis instance correctly and monitoring usage over time.

## Understand the Memory Overhead

Redis uses more memory than just your raw data. Every key has metadata overhead:

```bash
redis-cli INFO memory
```

Key fields to examine:
- `used_memory`: Memory allocated for data
- `used_memory_rss`: Memory the OS reports Redis is using (typically higher due to fragmentation)
- `mem_fragmentation_ratio`: Ratio of RSS to used_memory; above 1.5 indicates fragmentation

A typical key has 60-90 bytes of overhead before any value is stored.

## Estimate Data Size Before Deployment

Use `OBJECT ENCODING` and `MEMORY USAGE` to sample your data:

```bash
# After inserting representative data
MEMORY USAGE user:12345
# Returns bytes used by this key and its value

OBJECT ENCODING user:12345
# Returns encoding (listpack, hashtable, etc.)
```

For a fleet of 1 million user objects averaging 200 bytes each plus 80 bytes overhead, budget: `1,000,000 * 280 = 280MB`.

## Set maxmemory with a Safety Margin

Always leave headroom for fragmentation, AOF rewrites, and replication buffers:

```text
# redis.conf
maxmemory 3gb
maxmemory-policy allkeys-lru
```

For a server with 4GB RAM:
- System OS: ~500MB
- Redis data: ~3GB
- Internal Redis overhead: ~200MB
- AOF rewrite buffer: ~300MB (peak)

Set `maxmemory` to about 70-75% of available RAM.

## Account for Replication Buffer

Each replica connection uses a replication buffer. With large datasets or slow replicas, this can grow significantly:

```text
# redis.conf
client-output-buffer-limit replica 256mb 64mb 60
```

This limits the output buffer to 256MB hard limit and 64MB soft limit (enforced after 60 seconds).

## Monitor Memory Growth Trends

Track memory growth over time to predict when you will hit limits:

```bash
# Sample memory usage in a script
while true; do
    redis-cli INFO memory | grep used_memory_human
    sleep 60
done
```

If usage grows by 10MB per day, you have roughly 30 days before a 300MB buffer is exhausted.

## Use OBJECT ENCODING for Optimization

Redis uses memory-efficient encodings for small collections. Know the thresholds:

```text
Hash: listpack (up to 128 fields, each up to 64 bytes) vs hashtable
List: listpack (small lists) vs quicklist with listpack nodes (default max 8kb per node)
Set: intset (up to 512 integers) or listpack vs hashtable
Sorted Set: listpack (up to 128 members, each up to 64 bytes) vs skiplist
```

```bash
# Check thresholds in redis.conf
hash-max-listpack-entries 128
hash-max-listpack-value 64
```

Keeping objects within these thresholds can reduce memory by 5-10x.

## Plan for Peak Usage

Size for your traffic peaks, not averages. If your cache grows 3x during peak hours, your baseline sizing must accommodate that:

```text
Average dataset: 1GB
Peak multiplier: 3x
Required maxmemory: 3GB
Safety buffer (25%): +750MB
System and Redis overhead: ~1GB
Total server RAM needed: ~5GB
```

## Summary

Redis memory planning requires accounting for data size, key overhead, fragmentation, replication buffers, and peak traffic patterns. Set `maxmemory` to 70-75% of available RAM, monitor growth trends continuously, and use compact encodings by keeping collections within their listpack thresholds. Planning proactively prevents OOM errors and unexpected evictions in production.
