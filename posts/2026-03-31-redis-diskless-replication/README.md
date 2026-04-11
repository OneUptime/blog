# How Redis Diskless Replication Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Diskless, Performance, Configuration

Description: Learn how Redis diskless replication streams RDB data directly to replicas over the network without writing a snapshot to disk, and when to use it.

---

Prior to Redis 7.0, Redis replication defaults to saving an RDB snapshot to disk before sending it to new replicas. Since Redis 7.0, diskless replication is enabled by default. Diskless replication bypasses the disk step by streaming the RDB data directly to replicas over a socket. This reduces disk I/O and speeds up initial sync on fast networks.

## Standard vs Diskless Replication

Standard replication:

```text
Primary: fork -> write RDB to disk -> send file over socket -> delete file
```

Diskless replication:

```text
Primary: fork -> stream RDB directly over socket (no disk write)
```

The difference matters most when:
- Your primary has slow or limited disk I/O
- Your network bandwidth exceeds disk throughput
- You have many replicas joining simultaneously

## Enabling Diskless Replication

```bash
# redis.conf
repl-diskless-sync yes
repl-diskless-sync-delay 5
repl-diskless-sync-max-replicas 0
```

Or at runtime:

```bash
redis-cli CONFIG SET repl-diskless-sync yes
redis-cli CONFIG SET repl-diskless-sync-delay 5
```

The `repl-diskless-sync-delay` setting (default 5 seconds) introduces a brief wait to batch multiple replicas into a single RDB stream. Set it lower for faster initial sync or higher to amortize cost across more replicas.

## Diskless Replicas (Load from Socket)

Replicas can also be configured to avoid writing the received RDB to disk before loading it into memory:

```bash
# redis.conf on replica
repl-diskless-load on-empty-db
# or
repl-diskless-load swapdb
```

- `on-empty-db`: Only loads disklessly if the replica's DB is empty (safest)
- `swapdb`: Swaps in the new DB while serving reads from the old one - faster failover but uses more memory

## When Diskless Replication Helps

```text
Scenario: 8 replicas joining a 40GB dataset primary

Standard:
  - Write 40GB to disk: ~80 seconds
  - Send 40GB from disk to each replica: 8 disk reads
  - Total: significant time + heavy disk I/O

Diskless (max-replicas=0 means unlimited):
  - Stream 40GB once to all 8 replicas in parallel
  - No disk write at all
  - Total: one pass over the data
```

## Monitoring Diskless Sync

Check current configuration:

```bash
redis-cli CONFIG GET repl-diskless-sync
redis-cli CONFIG GET repl-diskless-sync-delay
```

Watch the Redis log during a replica join to confirm diskless mode is active:

```text
Starting BGSAVE for SYNC with target: replicas sockets
Background RDB transfer started by pid 12345 to replica socket
```

Compare to standard mode which logs:

```text
Starting BGSAVE for SYNC with target: disk
```

## Trade-offs

Diskless replication is not always better:

```text
Prefer STANDARD when:
  - Disk is fast (NVMe) and network is slow
  - You need the RDB snapshot on disk anyway (for backup)
  - Multiple replicas at different times (serial is fine)

Prefer DISKLESS when:
  - Disk I/O is expensive (cloud, shared storage)
  - Network is fast (10Gbps+)
  - Many replicas joining simultaneously
```

## Summary

Redis diskless replication eliminates the intermediate RDB file during initial sync, directly streaming data to replicas. Enable it with `repl-diskless-sync yes` and tune `repl-diskless-sync-delay` to batch multiple replicas. It delivers significant benefits for disk-constrained or high-replica-count deployments.
