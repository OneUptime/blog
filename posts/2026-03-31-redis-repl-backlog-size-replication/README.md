# How to Configure Redis repl-backlog-size for Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Configuration, Performance

Description: Configure repl-backlog-size to enable partial resynchronization when replicas reconnect after short disconnections, avoiding expensive full resync.

---

When a Redis replica reconnects to its primary after a brief disconnection, it attempts a partial resynchronization (PSYNC) to catch up on missed commands. This only works if those commands are still available in the primary's replication backlog. The `repl-backlog-size` directive controls the size of this circular buffer.

## How the Replication Backlog Works

The backlog is a fixed-size circular buffer in the primary's memory. Every write command sent to replicas is also stored here. When a replica reconnects, it sends its last known replication offset. If that offset is still within the backlog, the primary sends only the missed commands (partial sync). If the offset has been overwritten, a full resync is required.

## Default and Recommended Values

```text
# redis.conf
repl-backlog-size 1mb
```

The default of 1 MB is often too small for production. Calculate a better value:

```text
backlog_size = write_rate_per_second * max_expected_disconnect_seconds
```

For a Redis instance writing 50 MB/s that needs to handle 30-second disconnections:

```text
50 MB/s * 30s = 1500 MB
```

Set a larger backlog:

```text
# redis.conf
repl-backlog-size 1500mb
```

Or update at runtime:

```bash
redis-cli CONFIG SET repl-backlog-size 500mb
redis-cli CONFIG GET repl-backlog-size
```

## Checking if Partial Sync Succeeded

After a replica reconnects, check the Redis logs:

```bash
tail -f /var/log/redis/redis-server.log
```

```text
# Partial sync succeeded:
Partial resynchronization request from 192.168.1.10:6380 accepted. Sending 2048 bytes of backlog starting from offset 54321.

# Backlog too small - full sync required:
Unable to partial resync with replica 192.168.1.10:6380 for lack of backlog (Replica request was: 12345).
```

Monitor the INFO stats:

```bash
redis-cli INFO stats | grep sync
```

```text
sync_full:3
sync_partial_ok:47
sync_partial_err:2
```

A high `sync_partial_err` means replicas are frequently triggering full resyncs because the backlog is too small.

## Backlog Lifetime

The backlog is released when all replicas disconnect for longer than `repl-backlog-ttl` seconds:

```text
# redis.conf
repl-backlog-ttl 3600
```

After this timeout with no connected replicas, the memory is freed. Set to 0 to keep the backlog indefinitely:

```text
repl-backlog-ttl 0
```

## Memory Considerations

The backlog is allocated as a contiguous block in memory. A 1 GB backlog reserves 1 GB of memory even during normal operation. Balance between:

- Large enough to handle realistic disconnect durations
- Small enough not to waste memory on the primary

For most production systems, `repl-backlog-size 100mb` to `500mb` covers brief network interruptions while keeping memory overhead reasonable.

## Calculating Write Rate

Measure your current write throughput:

```bash
redis-cli INFO stats | grep instantaneous_input_kbps
```

```text
instantaneous_input_kbps:51200
```

This shows roughly 50 MB/s of incoming write traffic. If replicas could disconnect for up to 10 seconds, you need at least a 500 MB backlog.

## Summary

`repl-backlog-size` determines how much replication history the primary retains for partial resynchronization. Size it based on your write rate multiplied by the maximum expected disconnect duration. Monitor `sync_partial_err` to detect when the backlog is too small and replicas are falling back to expensive full resyncs.
