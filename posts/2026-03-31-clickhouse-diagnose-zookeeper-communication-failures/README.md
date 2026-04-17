# How to Diagnose ClickHouse ZooKeeper Communication Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ZooKeeper, Replication, Diagnosis, Keeper, Distributed System

Description: Diagnose ZooKeeper communication failures in ClickHouse by analyzing connection errors, replication queue backlog, and ZooKeeper session health metrics.

---

## Why ZooKeeper Failures Matter

ClickHouse replicated tables use ZooKeeper (or ClickHouse Keeper) for:
- Tracking which parts each replica has
- Coordinating leader election for INSERTs
- Synchronizing schema changes across replicas

When ZooKeeper becomes unavailable or slow, replicated INSERTs fail, replication queues grow, and eventually replicas diverge.

## Step 1 - Check ZooKeeper Connection Status

```sql
SELECT
    metric,
    value
FROM system.metrics
WHERE metric LIKE '%Zookeeper%' OR metric LIKE '%DistributedConnections%';
```

Key metrics:
- `ZooKeeperSession` - number of active sessions (should be > 0)
- `ZooKeeperRequest` - pending ZooKeeper requests
- `ZooKeeperWatch` - active watches

## Step 2 - Check ZooKeeper Error Counters

```sql
SELECT
    event,
    value
FROM system.events
WHERE event LIKE '%Zookeeper%'
ORDER BY value DESC;
```

Look for:
- `ZooKeeperHardwareExceptions` - connection-level errors
- `ZooKeeperUserExceptions` - exceptions from user requests (e.g., node already exists)
- `ZooKeeperOtherExceptions` - other ZooKeeper-related exceptions

## Step 3 - Check Replication Queue Backlog

When ZooKeeper is slow, the replication queue grows:

```sql
SELECT
    table,
    count() AS queued,
    max(create_time) AS latest,
    min(create_time) AS oldest
FROM system.replication_queue
GROUP BY table
ORDER BY queued DESC;
```

A growing queue with old timestamps indicates ZooKeeper is not processing operations fast enough.

## Step 4 - Check ZooKeeper Latency

Inspect the active ZooKeeper connection and session state:

```sql
SELECT
    name,
    host,
    port,
    connected_time,
    session_uptime_elapsed_seconds,
    is_expired,
    last_zxid_seen
FROM system.zookeeper_connection;
```

You can also browse ZooKeeper nodes directly (the `path =` filter is required):

```sql
SELECT name, ctime, mtime, numChildren
FROM system.zookeeper
WHERE path = '/';
```

Check ZooKeeper leader latency from its own stats:

```bash
echo mntr | nc zookeeper1 2181 | grep -E "latency|outstanding|watches"
```

High `outstanding_requests` means ZooKeeper is overwhelmed.

## Step 5 - Inspect Server Log for ZooKeeper Errors

```bash
grep -i "zookeeper\|keeper\|session expired\|connection refused" \
  /var/log/clickhouse-server/clickhouse-server.log | tail -50
```

Common messages:
- `ZooKeeper session expired` - ClickHouse lost its ZK session; replication stops until reconnection
- `Cannot connect to ZooKeeper` - ZK node unreachable
- `ZooKeeper operation timeout` - ZK is overloaded

## Remediation Steps

1. Restart ZooKeeper or Keeper if it's unresponsive
2. Force replica re-sync after ZooKeeper recovery:

```sql
SYSTEM SYNC REPLICA events;
```

3. Check replica consistency:

```sql
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size
FROM system.replicas
WHERE absolute_delay > 0
ORDER BY absolute_delay DESC;
```

4. Consider migrating to ClickHouse Keeper for better performance and simpler operations.

## Summary

Diagnose ZooKeeper communication failures in ClickHouse by monitoring `system.metrics` for active ZooKeeper sessions, checking `system.events` for exception counts, tracking `system.replication_queue` for backlog growth, and tailing the server log for session expiry messages. After ZooKeeper recovery, use `SYSTEM SYNC REPLICA` to restore replication.
