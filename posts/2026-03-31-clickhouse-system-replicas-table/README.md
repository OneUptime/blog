# How to Use system.replicas Table in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.replicas, Replication, ReplicatedMergeTree, Monitoring, High Availability

Description: Use system.replicas to monitor replication health, queue depth, leader status, and replication lag across all ReplicatedMergeTree tables.

---

ClickHouse replication is managed at the table level using `ReplicatedMergeTree` and its variants. The `system.replicas` table provides a comprehensive view of replication health for every replicated table on the current server, including queue depth, lag, and error state.

## What is system.replicas?

`system.replicas` shows the replication state for each `ReplicatedMergeTree` table on the current node. Each row corresponds to one replicated table. Key columns:

- `database`, `table` - table identity
- `engine` - e.g., `ReplicatedMergeTree`
- `is_leader` - whether this replica is the current leader
- `is_readonly` - true if the replica cannot accept writes
- `is_session_expired` - ZooKeeper/Keeper session health
- `queue_size` - number of pending replication tasks
- `inserts_in_queue` - pending insert replication tasks
- `merges_in_queue` - pending merge replication tasks
- `absolute_delay` - how far behind in seconds the current replica is
- `total_replicas`, `active_replicas` - replica count in the shard

## Basic Health Check

```sql
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    queue_size,
    absolute_delay,
    total_replicas,
    active_replicas
FROM system.replicas
ORDER BY absolute_delay DESC, queue_size DESC;
```

## Detecting Unhealthy Replicas

```sql
SELECT
    database,
    table,
    is_readonly,
    is_session_expired,
    last_queue_update_exception,
    absolute_delay
FROM system.replicas
WHERE is_readonly = 1
   OR is_session_expired = 1
   OR absolute_delay > 300;
```

Replicas that are readonly or have an expired session need immediate attention.

## Monitoring Queue Depth

A large `queue_size` means the replica is behind on applying replication tasks:

```sql
SELECT
    database,
    table,
    queue_size,
    inserts_in_queue,
    merges_in_queue,
    absolute_delay
FROM system.replicas
WHERE queue_size > 100
ORDER BY queue_size DESC;
```

## Finding the Leader Replica

```sql
SELECT
    database,
    table,
    replica_name,
    is_leader
FROM system.replicas
WHERE is_leader = 1;
```

One or more replicas per shard can be leaders at the same time. Leaders are responsible for scheduling background merges.

## Checking ZooKeeper Path

```sql
SELECT
    database,
    table,
    zookeeper_path,
    replica_path
FROM system.replicas
LIMIT 5;
```

Use these paths for direct inspection in ZooKeeper or ClickHouse Keeper if replication issues are suspected.

## Monitoring Total vs Active Replicas

If `active_replicas < total_replicas`, some replicas are offline:

```sql
SELECT
    database,
    table,
    total_replicas,
    active_replicas,
    total_replicas - active_replicas AS offline_replicas
FROM system.replicas
WHERE active_replicas < total_replicas;
```

## Summary

`system.replicas` is the essential monitoring table for ClickHouse replication health. Check it regularly for replication lag (`absolute_delay`), queue depth, readonly state, and session health. Set up alerts when `absolute_delay > 60` seconds or `is_readonly = 1` to catch replication issues before they affect query freshness.
