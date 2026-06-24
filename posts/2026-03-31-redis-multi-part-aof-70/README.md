# How to Use Multi-Part AOF in Redis 7.0+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Persistence, Durability, Configuration

Description: Learn how Redis 7.0's multi-part AOF format works, how to configure it, and how it improves persistence reliability by eliminating blocking AOF rewrites.

---

Redis 7.0 replaced the single-file AOF (Append Only File) with a multi-part AOF format. Instead of one growing log file that periodically gets rewritten, Redis now maintains a base snapshot and smaller incremental files, making persistence more reliable and operations faster.

## How Multi-Part AOF Works

The old single-file AOF had a problem: during `BGREWRITEAOF`, Redis had to buffer all new writes in an `aof_rewrite_buf` (doubling memory usage), write every command to disk twice, and briefly freeze the main process at the end of the rewrite to drain and fsync the buffer. Redis 7.0 splits the AOF into:

1. **Base file**: A snapshot of data at a point in time (RDB or AOF format)
2. **Incremental files**: Sequential AOF logs of commands since the last base

```text
/var/lib/redis/appendonlydir/
  appendonly.aof.1.base.rdb    <- base snapshot
  appendonly.aof.1.incr.aof    <- incremental log
  appendonly.aof.manifest      <- tracks which files are active
```

When a rewrite is triggered, Redis:
1. Creates a new base file in the background
2. Switches the active incremental file
3. Atomically updates the manifest - no blocking

## Enabling Multi-Part AOF

In `redis.conf`:

```text
appendonly yes
appenddirname "appendonlydir"
appendfilename "appendonly.aof"
```

Redis 7.0+ always uses the multi-part format when AOF is enabled. The `appenddirname` directive controls the directory name (default: `appendonlydir`).

## Checking AOF Status

```bash
redis-cli INFO persistence
```

Key fields:

```text
aof_enabled:1
aof_rewrite_in_progress:0
aof_rewrite_scheduled:0
aof_last_rewrite_time_sec:2
aof_current_rewrite_time_sec:-1
aof_base_size:10240000
aof_pending_rewrite:0
```

## Viewing the AOF Directory

```bash
ls -lh /var/lib/redis/appendonlydir/
# -rw-r--r-- 1 redis redis 9.8M appendonly.aof.1.base.rdb
# -rw-r--r-- 1 redis redis 1.2M appendonly.aof.2.incr.aof
# -rw-r--r-- 1 redis redis  256 appendonly.aof.manifest
```

## Triggering a Rewrite

```bash
redis-cli BGREWRITEAOF
# Background append only file rewriting started
```

After completion, a new base file is created and the old incremental files are removed.

## AOF Durability Settings

Control how often data is flushed to disk:

```text
# Flush after every command (safest, slowest)
appendfsync always

# Flush every second (recommended)
appendfsync everysec

# Never force flush (fastest, least safe)
appendfsync no
```

## Disabling AOF Rewrite During High Load

```bash
# Prevent auto rewrite from triggering during peak hours
redis-cli CONFIG SET auto-aof-rewrite-percentage 0

# Re-enable at off-peak
redis-cli CONFIG SET auto-aof-rewrite-percentage 100
```

## Reading the Manifest File

```bash
cat /var/lib/redis/appendonlydir/appendonly.aof.manifest
# file appendonly.aof.1.base.rdb seq 1 type b
# file appendonly.aof.2.incr.aof seq 2 type i
```

The manifest is the authoritative record of which files are part of the current AOF.

## Recovering from a Corrupted AOF

If Redis fails to load a corrupted incremental file:

```bash
redis-check-aof --fix /var/lib/redis/appendonlydir/appendonly.aof.manifest
```

This checks all component files (base and incremental) in order via the manifest. You can also pass an individual AOF file path, but using the manifest is recommended in Redis 7.0+ for holistic validation.

## Summary

Redis 7.0's multi-part AOF eliminates the rewrite-related overhead by splitting persistence into a base snapshot and incremental files managed by a manifest. This removes the extra memory consumption from the rewrite buffer, avoids the brief freeze at the end of a rewrite, and eliminates double disk I/O during rewrites - all without changing the durability guarantees or the `BGREWRITEAOF` command interface.
