# How AOF Persistence Works in Redis Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, AOF, Durability

Description: A step-by-step explanation of how Redis Append-Only File (AOF) persistence works, from write commands to fsync and log rewriting.

---

## What Is AOF Persistence?

Redis AOF (Append-Only File) persistence logs every write command that modifies the dataset to a file on disk. On restart, Redis replays these commands to reconstruct the dataset. AOF provides a much more durable persistence option than RDB snapshots because you can configure it to sync to disk on every write.

## Step 1 - Enabling AOF

Enable AOF in `redis.conf`:

```text
appendonly yes
appendfilename "appendonly.aof"
dir /var/lib/redis
```

Or enable at runtime:

```bash
redis-cli CONFIG SET appendonly yes
```

## Step 2 - Writing a Command

When a client sends a write command like `SET key value`, Redis processes it immediately in memory. After the command executes successfully, Redis appends it to an in-memory AOF buffer in RESP (Redis Serialization Protocol) format:

```text
*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n
```

The command is written to the buffer, not directly to disk at this point.

## Step 3 - Flushing to Disk (fsync Policy)

The `appendfsync` option controls how often the buffer is flushed to disk:

```text
# Sync on every write command (safest, slowest)
appendfsync always

# Sync every second (good balance of safety and speed)
appendfsync everysec

# Let the OS decide when to sync (fastest, least safe)
appendfsync no
```

With `everysec`, a background thread calls `fsync()` once per second, limiting potential data loss to one second of writes.

## Step 4 - Growing the AOF File

As commands accumulate, the AOF file grows. For example, if you SET a key 1000 times, the file contains 1000 SET commands even though only the last value matters. This is by design - it prioritizes durability over compactness.

You can check the file size:

```bash
ls -lh /var/lib/redis/appendonly.aof
```

## Step 5 - AOF Rewrite (Compaction)

Redis periodically rewrites the AOF to compact it. The rewrite produces a minimal set of commands that represents the current dataset. For example, 1000 SET commands for the same key become a single SET command.

The rewrite process:

1. Redis forks a child process
2. The child writes the current in-memory dataset as a compact AOF to a temporary file
3. New write commands during the rewrite go to both the old AOF and an in-memory rewrite buffer
4. When the child finishes, Redis atomically replaces the old AOF with the new compact one and appends the rewrite buffer

Trigger a manual rewrite:

```bash
redis-cli BGREWRITEAOF
```

Configure automatic rewrites in `redis.conf`:

```text
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

This means: trigger a rewrite when the AOF has grown 100% since the last rewrite and is at least 64 MB.

## Step 6 - Restart and Recovery

When Redis starts with AOF enabled, it reads the AOF file and replays every command:

```bash
redis-server --appendonly yes
```

Redis logs the recovery process:

```text
* DB loaded from append only file: 2.123 seconds
```

If the AOF file is truncated or corrupted at the end (common after a crash), Redis can repair it:

```bash
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

## Step 7 - Multi-Part AOF (Redis 7.0+)

Redis 7.0 introduced a multi-part AOF format where the AOF is split into a base file (RDB format) and incremental files:

```text
/var/lib/redis/
  appendonlydir/
    appendonly.aof.1.base.rdb
    appendonly.aof.1.incr.aof
    appendonly.aof.manifest
```

This reduces recovery time significantly because the base file is loaded with RDB speed.

## Monitoring AOF Status

Check AOF status with `INFO persistence`:

```bash
redis-cli INFO persistence
```

Sample output:

```text
aof_enabled:1
aof_rewrite_in_progress:0
aof_rewrite_scheduled:0
aof_last_rewrite_time_sec:2
aof_current_rewrite_time_sec:-1
aof_last_bgrewrite_status:ok
aof_last_write_status:ok
aof_last_cow_size:0
module_fork_in_progress:0
module_fork_last_cow_size:0
```

## Summary

AOF persistence in Redis works by appending every write command to a buffer, periodically flushing to disk via fsync, and periodically compacting the file through background rewrites. The process balances durability and performance, with the `everysec` fsync policy providing a practical compromise for most production workloads. Redis 7.0's multi-part AOF further improves recovery speed by combining RDB and AOF formats.
