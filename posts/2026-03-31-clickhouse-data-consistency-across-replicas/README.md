# How to Check for Data Consistency Across ClickHouse Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Data Consistency, Replica, system.replicas, Validation

Description: Check and verify data consistency across ClickHouse replicas by comparing row counts, checksums, and part inventories using system tables and CHECK TABLE commands.

---

## Why Replicas Can Diverge

ClickHouse replicated tables use an eventually-consistent replication model. Replicas can temporarily diverge when:
- A replica falls behind due to network issues
- ZooKeeper session expires during a merge
- A hardware failure corrupts data on one replica
- Manual part operations (ATTACH, DETACH) are performed on one node

## Step 1 - Check Replica Lag

```sql
SELECT
    database,
    table,
    replica_name,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size,
    inserts_in_queue
FROM system.replicas
WHERE absolute_delay > 0 OR queue_size > 0
ORDER BY absolute_delay DESC;
```

`absolute_delay` > 0 means the replica is behind. `queue_size` shows pending replication tasks.

## Step 2 - Compare Row Counts Across Replicas

Run this on each replica node and compare results:

```sql
SELECT
    table,
    sum(rows) AS total_rows
FROM system.parts
WHERE database = 'default' AND active
GROUP BY table
ORDER BY table;
```

Row count differences indicate replication lag or data loss on one replica.

## Step 3 - Compare Part Inventories

```sql
SELECT
    name,
    rows,
    bytes_on_disk,
    modification_time
FROM system.parts
WHERE database = 'default'
  AND table = 'events'
  AND active
ORDER BY name;
```

Run on both replicas and `diff` the output. Missing or extra parts on one side indicate divergence.

## Step 4 - Use CHECK TABLE

ClickHouse can verify the integrity of parts on the local replica by comparing each part's files against the checksums stored inside the part itself:

```sql
CHECK TABLE events;
```

This catches local corruption. ClickHouse relies on ZooKeeper-stored checksums separately during fetches and merges to reconcile between replicas.

## Step 5 - Force Replica Sync

If a replica is lagging, force it to pull replication log entries and fetch any missing parts from peer replicas (ClickHouse uses multi-leader replication, so there is no single leader):

```sql
SYSTEM SYNC REPLICA events;
-- Wait for the replication queue to become completely empty
SYSTEM SYNC REPLICA events STRICT;
```

If a replica has corrupted parts, ClickHouse fetches the correct version from another replica automatically after detection.

## Monitoring Replication Health with Queries

Track consistency over time with a monitoring query:

```sql
SELECT
    replica_name,
    total_replicas,
    active_replicas,
    absolute_delay,
    last_queue_update
FROM system.replicas
WHERE database = 'default'
ORDER BY replica_name;
```

Alert when `absolute_delay > 300` (5 minutes) or `active_replicas < total_replicas`.

## Fixing Persistent Divergence

If a replica consistently has wrong data even after sync, detach the bad parts and explicitly fetch the healthy copy from another replica:

```sql
ALTER TABLE events DETACH PART '20260101_1_500_5';
-- Then fetch the correct part from a peer replica
ALTER TABLE events FETCH PART '20260101_1_500_5' FROM '/clickhouse/tables/{shard}/events';
ALTER TABLE events ATTACH PART '20260101_1_500_5';
```

Detaching alone moves the part to the `detached/` directory without triggering an automatic re-fetch, so an explicit `FETCH PART` (or `ATTACH` of a known-good copy) is required.

## Summary

Check ClickHouse replica consistency by comparing row counts and part inventories across nodes, using `CHECK TABLE` to verify local part integrity, and monitoring `system.replicas` for replication lag. Use `SYSTEM SYNC REPLICA` to force catch-up, and detach then `FETCH PART` to replace corrupted parts from healthy replicas.
