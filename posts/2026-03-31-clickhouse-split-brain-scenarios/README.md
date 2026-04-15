# How to Handle Split-Brain Scenarios in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Split Brain, Replication, Cluster, High Availability

Description: Learn how to detect, prevent, and recover from split-brain scenarios in ClickHouse replicated clusters to avoid data inconsistency.

---

## What Is a Split-Brain in ClickHouse?

A split-brain occurs when a network partition causes replicas to lose coordination with ClickHouse Keeper/ZooKeeper. Since ClickHouse uses multi-master replication (all replicas can accept writes), the real issue is that replicas can no longer synchronize their replication logs. When connectivity is restored, conflicting data parts may exist on different nodes, and ClickHouse must reconcile them.

## How ClickHouse Handles Divergence

ClickHouse's `ReplicatedMergeTree` uses ZooKeeper/ClickHouse Keeper to coordinate replicas. Each replica records its parts in ZooKeeper. If two replicas diverge, the one with the "wrong" data parts will be marked read-only and log errors:

```text
DB::Exception: Replica is not in active state.
```

You can see the state in `system.replicas`:

```sql
SELECT
    replica_name,
    is_readonly,
    is_session_expired,
    future_parts,
    queue_size
FROM system.replicas
WHERE table = 'events_local';
```

## Preventing Split-Brain

### Use ClickHouse Keeper with a Quorum

Deploy ClickHouse Keeper with an odd number of nodes (3 or 5) so that a quorum is required for decisions. A single-node Keeper can cause split-brain if it becomes isolated.

```xml
<keeper_server>
  <raft_configuration>
    <server><id>1</id><hostname>keeper-1</hostname><port>9234</port></server>
    <server><id>2</id><hostname>keeper-2</hostname><port>9234</port></server>
    <server><id>3</id><hostname>keeper-3</hostname><port>9234</port></server>
  </raft_configuration>
</keeper_server>
```

### Set insert_quorum

Require writes to succeed on multiple replicas before acknowledging:

```xml
<insert_quorum>2</insert_quorum>
<insert_quorum_timeout>60000</insert_quorum_timeout>
```

This prevents a partitioned replica from accepting writes.

## Detecting Divergence

Check for diverged parts across replicas:

```sql
SELECT
    replica_name,
    parts_to_check,
    log_max_index,
    log_pointer
FROM system.replicas
WHERE table = 'events_local'
ORDER BY replica_name;
```

If `log_pointer` values differ significantly, replicas have diverged.

## Recovery Steps

If a replica has diverged and is stuck in read-only mode:

```bash
# Step 1: Stop the affected ClickHouse node
sudo systemctl stop clickhouse-server

# Step 2: From a healthy replica, drop the ZooKeeper path for the affected replica
clickhouse-client --query "
  SYSTEM DROP REPLICA 'replica-2' FROM TABLE events_local
"

# Step 3: Restart and let it re-sync from the healthy replica
sudo systemctl start clickhouse-server
```

ClickHouse will fetch missing data parts from the healthy replica automatically.

## Force Re-Sync with SYSTEM SYNC REPLICA

```sql
SYSTEM SYNC REPLICA events_local;
```

This waits until the replica has applied all entries from the replication queue.

## Summary

Split-brain in ClickHouse is prevented by using ClickHouse Keeper with quorum, enabling `insert_quorum`, and monitoring `system.replicas` for divergence. When a split-brain occurs, use `SYSTEM DROP REPLICA` to remove the diverged replica from ZooKeeper, then restart the node to re-sync cleanly from the healthy replica.
