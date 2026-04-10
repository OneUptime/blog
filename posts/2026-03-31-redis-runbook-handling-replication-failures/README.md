# Redis Runbook: Handling Replication Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Runbook, Replication

Description: Step-by-step runbook for diagnosing and recovering from Redis replication failures, including full resync loops and replica lag issues.

---

Replication failures in Redis can lead to replicas falling behind or triggering repeated full resyncs, increasing load on the primary. This runbook covers detection, triage, and recovery steps.

## Step 1: Detect the Failure

Check replication status on the primary:

```bash
redis-cli INFO replication
```

Look for replicas with an `offset` far behind the primary's `master_repl_offset`, or replicas stuck in `state:connect`.

Check replica lag:

```bash
redis-cli INFO replication | grep "lag="
```

## Step 2: Check Replica Status

On the replica, check what state it is in:

```bash
redis-cli INFO replication | grep -E "master_link_status|master_last_io_seconds_ago|master_sync_in_progress"
```

A `master_link_status:down` means the replica lost connection to the primary.

## Step 3: Check for Replication Buffer Overflow

If the replication backlog is too small, replicas fall out of sync and trigger full resyncs:

```bash
redis-cli INFO replication | grep "repl_backlog_size"
redis-cli INFO persistence | grep "rdb_bgsave_in_progress"
```

Increase the backlog size:

```bash
redis-cli CONFIG SET repl-backlog-size 256mb
```

## Step 4: Check Network Connectivity

Verify the replica can reach the primary:

```bash
redis-cli -h <primary-ip> -p 6379 PING
```

Check for firewall rules blocking port 6379 between nodes.

## Step 5: Force Replica Reconnect

If the replica is stuck, trigger a reconnect:

```bash
redis-cli -h <replica-ip> REPLICAOF <primary-ip> 6379
```

This forces the replica to re-establish the replication link.

## Step 6: Monitor for Full Resync Loop

A full resync loop is a sign of persistent problems. Watch for repeated BGSAVE triggers on the primary:

```bash
watch -n 2 "redis-cli INFO persistence | grep rdb_bgsave_in_progress"
```

If BGSAVE keeps triggering, the replica keeps reconnecting and requesting a full sync. Fix the backlog or network issue first.

## Step 7: Check Disk Space

Full resyncs require the primary to write an RDB file. Ensure disk space is available:

```bash
df -h /var/lib/redis
```

## Step 8: Review Configuration

Ensure both primary and replica use compatible configurations:

```bash
# redis.conf (primary)
repl-backlog-size 256mb
repl-timeout 60
min-replicas-to-write 1
min-replicas-max-lag 10
```

## Summary

Redis replication failures are typically caused by network issues, insufficient replication backlog, or disk problems. Quick diagnosis using `INFO replication` followed by fixing the backlog size or reconnecting the replica resolves most cases. Monitor for full resync loops as a sign of a deeper infrastructure issue.
