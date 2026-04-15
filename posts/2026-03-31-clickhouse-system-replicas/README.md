# How to Use system.replicas to Monitor Replication in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, ReplicatedMergeTree, System Table, Administration

Description: Learn how to query system.replicas to monitor replication lag, queue depth, ZooKeeper session health, and detect stuck or diverged replicas in ClickHouse.

---

`system.replicas` provides a row for every `ReplicatedMergeTree` table on the local node. It shows the current replication queue depth, how many log entries are being applied, whether the replica is active, and how far behind it is relative to the most advanced replica. It is the primary tool for diagnosing replication issues and confirming that all replicas are in sync.

## What system.replicas Contains

```sql
DESCRIBE system.replicas;
```

Key columns:

| Column | Type | Meaning |
|---|---|---|
| `database` | String | Database name |
| `table` | String | Table name |
| `engine` | String | Replication engine variant |
| `is_leader` | UInt8 | 1 if this replica is the current leader |
| `can_become_leader` | UInt8 | 1 if this replica is eligible to lead |
| `is_readonly` | UInt8 | 1 if the replica is read-only (usually a ZooKeeper issue) |
| `is_session_expired` | UInt8 | 1 if the ZooKeeper session has expired |
| `future_parts` | UInt32 | Parts that will exist after queue execution |
| `parts_to_check` | UInt32 | Parts queued for integrity verification |
| `zookeeper_path` | String | Path of this table in ZooKeeper |
| `replica_name` | String | This replica's name in ZooKeeper |
| `replica_path` | String | Full ZooKeeper path for this replica |
| `columns_version` | Int32 | Schema version number |
| `queue_size` | UInt32 | Number of operations waiting in the replication queue |
| `inserts_in_queue` | UInt32 | INSERT operations in queue |
| `merges_in_queue` | UInt32 | Merge operations in queue |
| `part_mutations_in_queue` | UInt32 | Mutation operations in queue |
| `queue_oldest_time` | DateTime | Timestamp of the oldest queued entry |
| `inserts_oldest_time` | DateTime | Timestamp of the oldest queued INSERT |
| `merges_oldest_time` | DateTime | Timestamp of the oldest queued merge |
| `log_max_index` | UInt64 | Max log index in ZooKeeper |
| `log_pointer` | UInt64 | Last log index applied by this replica |
| `last_queue_update` | DateTime | Last time the queue was refreshed |
| `absolute_delay` | UInt64 | Seconds this replica lags behind the most advanced replica |
| `total_replicas` | UInt32 | Total replica count for this table |
| `active_replicas` | UInt32 | Number of replicas currently active |
| `last_queue_update_exception` | String | Last error from queue processing |
| `zookeeper_exception` | String | Last ZooKeeper error |

## Overall Replication Health

```sql
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    is_session_expired,
    queue_size,
    absolute_delay,
    active_replicas,
    total_replicas
FROM system.replicas
ORDER BY database, table;
```

Every row with `is_readonly = 1` or `is_session_expired = 1` requires immediate attention.

## Find Replicas That Are Behind

```sql
SELECT
    database,
    table,
    replica_name,
    absolute_delay,
    queue_size,
    log_max_index - log_pointer AS log_entries_behind
FROM system.replicas
WHERE absolute_delay > 60
   OR queue_size > 100
ORDER BY absolute_delay DESC;
```

`absolute_delay` is the most actionable metric. A value above 300 seconds means the replica is significantly behind and SELECT queries on it will return stale data.

## Check Queue Breakdown

```sql
SELECT
    database,
    table,
    queue_size,
    inserts_in_queue,
    merges_in_queue,
    part_mutations_in_queue,
    queue_oldest_time,
    inserts_oldest_time,
    merges_oldest_time
FROM system.replicas
WHERE queue_size > 0
ORDER BY queue_size DESC;
```

A queue dominated by `merges_in_queue` means the background merge pool is bottlenecked. A queue dominated by `inserts_in_queue` means the replica is falling behind on fetching new parts from the leader.

## Detect ZooKeeper Session Problems

```sql
SELECT
    database,
    table,
    is_session_expired,
    is_readonly,
    zookeeper_exception,
    last_queue_update_exception
FROM system.replicas
WHERE is_session_expired = 1
   OR is_readonly = 1
   OR zookeeper_exception != '';
```

## Identify the Current Leader

```sql
SELECT
    database,
    table,
    replica_name,
    is_leader,
    can_become_leader
FROM system.replicas
ORDER BY database, table, is_leader DESC;
```

In ClickHouse, multiple replicas can be leaders at the same time, as each leader independently schedules background merges. If all replicas show `is_leader = 0`, the table has no leader and merge scheduling is stalled.

## Log Pointer Gap Analysis

```sql
SELECT
    database,
    table,
    log_max_index,
    log_pointer,
    log_max_index - log_pointer AS entries_behind,
    absolute_delay
FROM system.replicas
ORDER BY entries_behind DESC;
```

## Alert Script: Replication Lag Monitor

```bash
#!/usr/bin/env bash
# Exit 1 if any replica is more than 300 seconds behind

MAX_DELAY=300

lagging=$(clickhouse-client --query "
    SELECT count()
    FROM system.replicas
    WHERE absolute_delay > ${MAX_DELAY}
      OR is_readonly = 1
      OR is_session_expired = 1
")

if [ "${lagging}" -gt 0 ]; then
    echo "ALERT: ${lagging} replica(s) are lagging or unhealthy"
    clickhouse-client --query "
        SELECT database, table, absolute_delay, is_readonly, is_session_expired
        FROM system.replicas
        WHERE absolute_delay > ${MAX_DELAY}
           OR is_readonly = 1
           OR is_session_expired = 1
        FORMAT PrettyCompactNoEscapes
    "
    exit 1
fi

echo "OK: All replicas are healthy"
```

## Force Synchronization

If a replica has fallen behind, you can force it to catch up:

```sql
-- Restart replication queue processing for a table
SYSTEM RESTART REPLICA default.events;
```

```sql
-- Sync all replicas before running a query (waits until this replica is up to date)
SYSTEM SYNC REPLICA default.events;
```

```sql
-- Fetch a specific missing part from another replica (downloads to the detached/ directory)
ALTER TABLE default.events FETCH PART '20240101_1_1_0' FROM '/clickhouse/tables/shard1/default/events';
-- Then attach it:
-- ALTER TABLE default.events ATTACH PART '20240101_1_1_0';
```

## Query All Replicas in a Cluster

In a multi-node deployment, query each replica remotely using `clusterAllReplicas()`:

```sql
SELECT
    hostName()      AS host,
    database,
    table,
    is_leader,
    queue_size,
    absolute_delay,
    is_readonly
FROM clusterAllReplicas('my_cluster', system.replicas)
ORDER BY host, database, table;
```

This gives a unified view of replication health across every node in the cluster.

## Common Pitfalls

- `system.replicas` is local to the node you are querying. A replica that looks healthy locally may have a peer that is far behind. Always query all nodes or use `clusterAllReplicas()`.
- `absolute_delay` is computed relative to the most advanced replica, not specifically the leader. If the table has no recent writes, `absolute_delay` stays at 0 even if the replica is far behind in queue processing.
- `is_readonly = 1` almost always means the ZooKeeper session was lost or the replica can no longer write to ZooKeeper. Restarting ClickHouse or the ZooKeeper client usually resolves it.
- A large `parts_to_check` value means the replica is verifying part checksums in the background, which is normal after recovery but can cause elevated I/O.

## Summary

`system.replicas` is the definitive health dashboard for replicated ClickHouse tables. Monitor `absolute_delay`, `queue_size`, `is_readonly`, and `is_session_expired` to catch replication problems before they affect query consistency. Use `SYSTEM RESTART REPLICA` and `SYSTEM SYNC REPLICA` when intervention is needed, and query all nodes with `clusterAllReplicas()` for a cluster-wide view.
