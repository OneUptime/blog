# How to Configure Redis for Maximum Durability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, Durability, Configuration

Description: Configure Redis for maximum data durability using AOF with always fsync, RDB snapshots, replication requirements, and system-level safeguards.

---

Redis is an in-memory store by default, but it can be configured to minimize data loss to near zero. This requires combining AOF persistence, synchronous fsync, replication safety directives, and proper system settings.

## Full Maximum Durability Configuration

```text
# redis.conf - maximum durability

# Enable AOF with synchronous writes
appendonly yes
appendfsync always
no-appendfsync-on-rewrite no

# Enable RDB as a backup snapshot
save 900 1
save 300 10
save 60 1000

# Hybrid AOF for fast restart
aof-use-rdb-preamble yes

# Require at least one replica to acknowledge before writing
min-replicas-to-write 1
min-replicas-max-lag 10

# Do not use RDB checksum shortcuts
rdbcompression yes
rdbchecksum yes

# Crash on write errors rather than silently continuing
stop-writes-on-bgsave-error yes
aof-rewrite-incremental-fsync yes
```

## Why appendfsync always

With `appendfsync always`, every write command is fsynced to disk before the client receives a response. This means you lose at most one command on a crash - effectively zero data loss for committed writes.

```bash
redis-cli CONFIG SET appendfsync always
```

Trade-off: throughput drops significantly (typically to 2,000-5,000 writes/second depending on disk speed).

## Enabling stop-writes-on-bgsave-error

This directive causes Redis to refuse writes if the latest background save failed:

```text
stop-writes-on-bgsave-error yes
```

This prevents a silent divergence where Redis accepts writes but cannot persist them. Applications receive write errors immediately instead of silently losing data.

Check the last save status:

```bash
redis-cli INFO persistence | grep rdb_last_bgsave_status
```

```text
rdb_last_bgsave_status:ok
```

If this shows `err`, investigate disk space and permissions before re-enabling writes.

## Replication Safety

Require at least one replica to acknowledge writes:

```bash
redis-cli CONFIG SET min-replicas-to-write 1
redis-cli CONFIG SET min-replicas-max-lag 10
```

This prevents data loss if the primary crashes before replicating to replicas.

## Enabling Replication Persistence

Ensure replicas also persist data, so a primary failure can be recovered from replica storage:

```text
# replica redis.conf
appendonly yes
appendfsync everysec  # replicas can use everysec for better performance
save 900 1
```

## System-Level Settings

```bash
# Allow memory overcommit to prevent fork failures during background saves
sudo sysctl -w vm.overcommit_memory=1

# Disable swap to prevent latency spikes
sudo swapoff -a

# Disable THP to reduce COW overhead
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
```

## Verifying Durability Settings

```bash
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync
redis-cli CONFIG GET min-replicas-to-write
redis-cli CONFIG GET stop-writes-on-bgsave-error
```

Monitor write latency with `appendfsync always`:

```bash
redis-cli --latency -h localhost
redis-cli INFO stats | grep instantaneous_ops_per_sec
```

## Summary

Maximum durability in Redis requires `appendfsync always` to ensure every write is fsynced before acknowledgment, `stop-writes-on-bgsave-error yes` to refuse writes when persistence fails, and `min-replicas-to-write 1` to require at least one synchronized replica. Combined with system settings (overcommit memory, disabled swap, disabled THP), this minimizes data loss to effectively zero for committed writes, at the cost of reduced write throughput.
