# How Hybrid Persistence (RDB + AOF) Works in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, RDB, AOF

Description: Learn how Redis hybrid persistence combines RDB snapshots with AOF command logging to provide fast restarts and strong durability in a single file.

---

Redis offers three persistence modes: RDB only, AOF only, and hybrid (RDB + AOF). The hybrid mode combines the fast startup of RDB with the durability of AOF, and is the recommended approach for most production deployments.

## What Hybrid Persistence Does

In hybrid mode (enabled by `aof-use-rdb-preamble yes`), an AOF rewrite produces a file structured as:

```text
[RDB binary snapshot][AOF commands since snapshot]
```

This means:

- On startup, Redis bulk-loads the RDB section (fast)
- Then replays only the AOF commands that occurred after the snapshot (minimal)
- The result is near-instant recovery even for large datasets

## How It Differs from RDB-Only and AOF-Only

| Mode | Durability | Restart Speed | File Size |
| --- | --- | --- | --- |
| RDB only | Up to last snapshot (minutes) | Fastest | Smallest |
| AOF only | Up to 1 second (everysec) | Slowest | Largest |
| Hybrid | Up to 1 second | Nearly as fast as RDB | Medium |

## Enabling Hybrid Persistence

```text
# redis.conf
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes

# Auto-rewrite the AOF to keep it compact
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

Apply at runtime:

```bash
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG SET aof-use-rdb-preamble yes
```

## The Hybrid File Lifecycle

1. Redis starts with an empty AOF file and begins logging commands
2. When the AOF grows past the rewrite threshold, `BGREWRITEAOF` triggers
3. The rewrite child writes a full RDB snapshot to a new file
4. The parent buffers new commands in the rewrite buffer
5. After the RDB section is complete, the buffer (AOF commands) is appended
6. The new hybrid file atomically replaces the old AOF file
7. The cycle repeats as commands accumulate

## Monitoring Hybrid File State

After an AOF rewrite, inspect the file to confirm the RDB preamble:

```bash
xxd /var/lib/redis/appendonly.aof | head -2
```

```text
00000000: 5245 4449 5330 3031 31fa 0972 6564 6973  REDIS0011..redis
```

The `REDIS0011` prefix confirms the RDB preamble is present.

Check rewrite activity:

```bash
redis-cli INFO persistence
```

```text
aof_enabled:1
aof_current_size:134217728
aof_base_size:67108864
aof_pending_rewrite:0
aof_rewrite_buffer_length:0
```

## Triggering a Manual Rewrite

```bash
redis-cli BGREWRITEAOF

# Monitor progress
watch -n1 "redis-cli INFO persistence | grep -E 'aof_rewrite|aof_current'"
```

## Recovery Process

When Redis restarts with a hybrid AOF file:

```bash
sudo systemctl stop redis
sudo systemctl start redis

# Watch the startup log
journalctl -u redis -f
```

```text
Reading RDB preamble from AOF file...
Reading the remaining AOF tail...
DB loaded from append only file: 2.534 seconds
```

Compare this to a pure AOF restart on the same dataset, which might take 60+ seconds.

## Backup Strategy for Hybrid Persistence

```bash
#!/bin/bash
# Backup hybrid AOF file with timestamp
DATE=$(date +%Y%m%d-%H%M%S)
cp /var/lib/redis/appendonly.aof /backup/redis/appendonly-${DATE}.aof

# Also back up the RDB if saves are enabled
cp /var/lib/redis/dump.rdb /backup/redis/dump-${DATE}.rdb
```

Validate backups:

```bash
redis-check-aof /backup/redis/appendonly-${DATE}.aof
```

## Summary

Redis hybrid persistence (`aof-use-rdb-preamble yes`) creates AOF files that begin with a compact RDB snapshot followed by incremental AOF commands. This gives you the durability of AOF (up to 1 second of data loss with `appendfsync everysec`) with restart speeds close to pure RDB. It is enabled by default in Redis 5.0+ and is the recommended persistence mode for most production systems that require both speed and durability.
