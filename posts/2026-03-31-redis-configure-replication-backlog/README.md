# How to Configure Redis Replication Backlog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Configuration, Backlog, Performance

Description: Learn how to configure Redis replication backlog size to enable partial resynchronization and reduce full resync costs after brief replica disconnections.

---

The Redis replication backlog is a circular buffer on the primary that stores recent write commands. When a replica reconnects after a brief disconnection, Redis uses this buffer to replay only the missed commands rather than sending a full RDB snapshot. Getting the backlog size right is critical for operational efficiency.

## How the Backlog Works

When a replica disconnects, the primary continues writing commands to the backlog. On reconnect, if the replica's offset still falls within the backlog window, a partial resync (`PSYNC`) occurs. If the offset has been overwritten, a full resync (`BGSAVE` + RDB transfer) is triggered.

```bash
redis-cli INFO replication
```

Key fields to observe:

```text
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:1048576
```

## Setting Backlog Size

The default backlog size is 1MB. For write-heavy workloads or replicas on slow networks, increase it:

```bash
# In redis.conf
repl-backlog-size 64mb
```

Or at runtime:

```bash
redis-cli CONFIG SET repl-backlog-size 67108864
```

## Calculating the Right Size

The formula is: `backlog_size = write_rate_bytes_per_second * expected_disconnect_duration_seconds`

For example, if your primary handles 10 MB/s of write traffic and you want to survive 30-second disconnections:

```text
10 MB/s * 30s = 300 MB backlog
```

Add a 2x safety margin:

```bash
redis-cli CONFIG SET repl-backlog-size 629145600
```

## Backlog TTL

By default, the backlog is released 3600 seconds after the last replica disconnects. Adjust this for your recovery time objectives:

```bash
# In redis.conf
repl-backlog-ttl 7200

# Or at runtime
redis-cli CONFIG SET repl-backlog-ttl 7200
```

Setting `repl-backlog-ttl 0` keeps the backlog forever (until a replica reconnects).

## Verifying Partial vs Full Resync

Check your Redis logs after a replica reconnects:

```text
# Partial resync (good)
MASTER <-> REPLICA sync: Master accepted a Partial Resynchronization.

# Full resync (expensive)
MASTER <-> REPLICA sync: Starting BGSAVE for SYNC with target: disk
```

You can also monitor via INFO stats:

```bash
redis-cli INFO stats | grep -E "sync_full|sync_partial"
```

```text
sync_full:2
sync_partial_ok:47
sync_partial_err:1
```

A high `sync_full` count relative to `sync_partial_ok` suggests the backlog is too small.

## Memory Considerations

The backlog consumes memory on the primary. Verify it is accounted for in your `maxmemory` planning:

```bash
redis-cli INFO memory | grep mem_replication_backlog
```

For production systems, set backlog size alongside `maxmemory` to avoid OOM situations.

## Summary

The Redis replication backlog enables cost-effective partial resyncs after brief disconnections. Size it based on your write rate and expected disconnect window, then verify effectiveness by monitoring `sync_full` vs `sync_partial_ok` counters. A well-tuned backlog dramatically reduces resync overhead in busy deployments.
