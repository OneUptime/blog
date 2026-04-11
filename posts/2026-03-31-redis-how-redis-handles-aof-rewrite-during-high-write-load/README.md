# How Redis Handles AOF Rewrite During High Write Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Persistence

Description: Learn how Redis manages AOF rewrite (BGREWRITEAOF) during heavy write traffic - including the dual-buffer mechanism, fsync behavior, and latency impact.

---

Redis Append-Only File (AOF) persistence logs every write command. Over time the AOF file grows and needs compaction via rewrite. During high write load, this rewrite can impact latency and disk I/O. Understanding how it works helps you tune Redis for production.

## What Happens During AOF Rewrite

When BGREWRITEAOF is triggered, Redis forks a child process. The child writes a new, compact AOF by scanning the current dataset in memory. Meanwhile, the parent continues serving writes.

```bash
redis-cli BGREWRITEAOF
redis-cli INFO persistence | grep aof
```

## The Dual-Buffer Mechanism (Redis < 7.0)

In Redis versions before 7.0, new writes that arrive during the rewrite are written to two places:
1. The existing AOF file (to stay durable while the rewrite is in progress)
2. An in-memory rewrite buffer (to be appended to the new AOF when the rewrite completes)

This ensures no writes are lost even if the rewrite takes a long time.

In Redis 7.0+, Multi-Part AOF replaced the in-memory rewrite buffer. Writes during a rewrite go to a separate incremental AOF file on disk, eliminating the memory overhead of the rewrite buffer and the blocking flush at completion.

## Monitoring Rewrite Progress

Check if a rewrite is in progress:

```bash
redis-cli INFO persistence | grep -E "aof_rewrite_in_progress|aof_current_size|aof_base_size"
```

Watch the rewrite buffer size, which grows during high write load (Redis < 7.0 only; this field was removed in 7.0 with Multi-Part AOF):

```bash
redis-cli INFO persistence | grep "aof_rewrite_buffer_length"
```

## Latency During Rewrite

In Redis < 7.0, the main latency source is the `fsync` call at rewrite completion when the rewrite buffer is appended to the new AOF. Under high write load, this buffer can be large, causing a brief blocking write. In Redis 7.0+, this blocking flush is eliminated since writes go to an incremental AOF file on disk, but `fsync` policies still affect overall write latency.

Check your fsync policy:

```bash
redis-cli CONFIG GET appendfsync
```

Recommended policies:
- `everysec` - fsync every second (good balance of durability and performance)
- `no` - let the OS decide (best performance, less durability)

## Automatic Rewrite Triggers

Redis automatically triggers AOF rewrite based on growth thresholds:

```bash
redis-cli CONFIG GET auto-aof-rewrite-percentage
redis-cli CONFIG GET auto-aof-rewrite-min-size
```

Default: trigger rewrite when AOF is 100% larger than the base size and at least 64MB:

```bash
# redis.conf
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

Under heavy write load, rewrites may trigger frequently. Increase the minimum size or percentage to reduce frequency:

```bash
redis-cli CONFIG SET auto-aof-rewrite-min-size 512mb
redis-cli CONFIG SET auto-aof-rewrite-percentage 200
```

## Disabling fsync During Rewrite

To reduce latency impact during rewrite, allow disabling fsync while rewrite is in progress:

```bash
redis-cli CONFIG SET no-appendfsync-on-rewrite yes
```

This trades some durability for reduced latency spikes during rewrite.

## Summary

Redis AOF rewrite uses a fork-based mechanism to remain durable during high write loads. In Redis < 7.0, new writes go to both the current AOF and an in-memory rewrite buffer; in Redis 7.0+, writes go to an incremental AOF file on disk (Multi-Part AOF). Tuning the `auto-aof-rewrite-min-size`, `appendfsync` policy, and enabling `no-appendfsync-on-rewrite` helps balance durability and performance.
