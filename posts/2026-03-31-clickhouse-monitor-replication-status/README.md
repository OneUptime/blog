# How to Monitor Replication Status in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Monitoring, system.replicas, ReplicatedMergeTree

Description: Learn how to monitor ClickHouse replication status using system tables, spot lagging replicas, and detect replication errors before they cause problems.

---

Keeping replication healthy in ClickHouse is critical for data durability and query consistency. ClickHouse exposes replication state through the `system.replicas` table, giving you visibility into lag, queue depth, and error conditions.

## Checking Overall Replication Health

The `system.replicas` table provides per-table replication metrics:

```sql
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    total_replicas,
    active_replicas,
    queue_size,
    absolute_delay,
    last_queue_update
FROM system.replicas
ORDER BY absolute_delay DESC, queue_size DESC;
```

Key columns to watch:
- `absolute_delay` - seconds of replication lag the replica currently has
- `queue_size` - number of replication tasks waiting to execute
- `is_readonly` - indicates the replica is not accepting writes
- `active_replicas` - should equal `total_replicas` in a healthy cluster

## Finding Lagging Replicas

Alert when any replica falls behind by more than a threshold:

```sql
SELECT
    database,
    table,
    replica_name,
    absolute_delay,
    queue_size
FROM system.replicas
WHERE absolute_delay > 300  -- more than 5 minutes behind
ORDER BY absolute_delay DESC;
```

## Inspecting the Replication Queue

The `system.replication_queue` table shows individual tasks waiting to execute:

```sql
SELECT
    database,
    table,
    type,
    create_time,
    required_quorum,
    source_replica,
    parts_to_merge,
    num_tries,
    last_exception
FROM system.replication_queue
ORDER BY num_tries DESC
LIMIT 20;
```

Tasks with high `num_tries` and a non-empty `last_exception` are stuck and need investigation.

## Monitoring with Prometheus

If you export ClickHouse metrics to Prometheus, track these metrics:

```text
ClickHouseMetrics_ReplicatedChecks
ClickHouseMetrics_ReplicatedFetch
ClickHouseMetrics_ReplicatedSend
ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay
```

Create a Prometheus alert for replica delay:

```text
- alert: ClickHouseReplicaLag
  expr: ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay > 300
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "ClickHouse replica is lagging"
    description: "Replica delay is {{ $value }} seconds on {{ $labels.instance }}"
```

## Checking Replica Synchronization

Force a sync check and see current state:

```sql
-- Trigger a replica check
SYSTEM SYNC REPLICA my_database.my_table;

-- Check that the replica is now fully caught up
SELECT
    database,
    table,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE database = 'my_database'
  AND table = 'my_table';
```

## Detecting Read-Only Replicas

A replica can become read-only if it loses ZooKeeper/Keeper connectivity:

```sql
SELECT
    database,
    table,
    replica_name,
    is_readonly,
    zookeeper_exception
FROM system.replicas
WHERE is_readonly = 1;
```

Check the `zookeeper_exception` column for connection error details.

## Summary

Monitor ClickHouse replication health using `system.replicas` for high-level lag metrics and `system.replication_queue` for task-level details. Watch for rising `absolute_delay`, stuck queue items with high retry counts, and read-only replicas. Set Prometheus alerts on `ReplicasMaxAbsoluteDelay` to catch problems before they affect query consistency or data durability.
