# How to Recover from Split-Brain in ClickHouse Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Split-Brain, Recovery, ZooKeeper

Description: Learn how to diagnose and recover from a split-brain situation in ClickHouse replication where replicas diverge and data becomes inconsistent.

---

A split-brain in ClickHouse replication occurs when replicas lose coordination through ZooKeeper or ClickHouse Keeper and begin accepting independent writes. Recovering requires identifying which replica holds the authoritative data and resynchronizing the others.

## Identifying a Split-Brain

Signs of split-brain include:
- Different row counts across replicas for the same table
- Replication queue items stuck indefinitely
- `zookeeper_exception` errors in `system.replicas`

Check row counts across all replicas:

```sql
SELECT
    hostName() AS host,
    count() AS row_count
FROM clusterAllReplicas('my_cluster', default, events_local)
GROUP BY host;
```

If counts differ significantly and replication is supposed to be caught up, you may have diverged replicas.

## Check Replication Errors

```sql
SELECT
    database,
    table,
    replica_name,
    last_queue_update,
    queue_size,
    zookeeper_exception,
    future_parts
FROM system.replicas
WHERE length(zookeeper_exception) > 0
   OR queue_size > 100;
```

## Step 1 - Restore ZooKeeper Connectivity

Most split-brain scenarios start with a network partition or ZooKeeper instability. Restore connectivity first:

```bash
# Check ZooKeeper/Keeper health from each node
clickhouse-keeper-client -h localhost -p 9181 -q "flwc ruok"

# Check ClickHouse can reach ZooKeeper
clickhouse-client --query "SELECT * FROM system.zookeeper WHERE path = '/clickhouse'"
```

Once connectivity is restored, ClickHouse may automatically reconcile differences through the normal replication mechanism.

## Step 2 - Identify the Authoritative Replica

Determine which replica has the most complete and correct data. Use business logic - which replica was the leader, which received the most inserts?

```sql
-- Check which replica is the leader
SELECT
    database,
    table,
    replica_name,
    is_leader,
    log_max_index,
    log_pointer
FROM system.replicas
WHERE database = 'my_database'
  AND table = 'my_table';
```

The replica with the highest `log_max_index` is usually the most up-to-date.

## Step 3 - Force Resync a Lagging Replica

If one replica has lost data relative to another, you can drop and re-attach it to resync from scratch:

```sql
-- On the lagging replica - detach the table
DETACH TABLE my_database.my_table;
```

Then remove the local data directory and reattach. ClickHouse will refetch all parts from the authoritative replica:

```bash
# On the lagging node
sudo rm -rf /var/lib/clickhouse/data/my_database/my_table/
```

```sql
-- Reattach - ClickHouse will sync from other replicas
ATTACH TABLE my_database.my_table;
```

## Step 4 - Trigger Manual Sync

After connectivity is restored, trigger a sync to flush the queue:

```sql
SYSTEM SYNC REPLICA my_database.my_table;

-- Monitor until queue_size reaches 0
SELECT database, table, queue_size, absolute_delay
FROM system.replicas
WHERE database = 'my_database' AND table = 'my_table';
```

## Step 5 - Verify Data Consistency

After sync completes, confirm row counts match across all replicas:

```sql
SELECT hostName(), count()
FROM clusterAllReplicas('my_cluster', default, events_local)
GROUP BY hostName();
```

## Summary

Split-brain recovery in ClickHouse involves restoring ZooKeeper connectivity, identifying the authoritative replica, forcing a resync on the lagging replica by dropping and re-attaching its data, and verifying that row counts match. Prevention relies on stable Keeper/ZooKeeper infrastructure with proper quorum configuration.
