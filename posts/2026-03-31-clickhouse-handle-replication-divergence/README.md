# How to Handle ClickHouse Replication Divergence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replication, Data Consistency, Incident Response, Operation

Description: Detect and resolve ClickHouse replication divergence where replicas have different data, using checksum comparison and controlled part re-fetch procedures.

---

Replication divergence happens when replicas have inconsistent data - different parts, different checksums, or different row counts. This is a serious condition that must be fixed before it causes incorrect query results.

## Detect Divergence

Compare row counts across replicas:

```sql
-- Run on each replica separately and compare
SELECT count() FROM events WHERE ts >= today() - 7;
```

Check for part checksum mismatches:

```sql
SELECT
    name,
    rows,
    hash_of_all_files,
    hash_of_uncompressed_files,
    active
FROM system.parts
WHERE table = 'events' AND active
ORDER BY name;
```

Compare the output from each replica. Mismatched `hash_of_all_files` or `hash_of_uncompressed_files` values indicate divergence.

## Identify the Root Cause

Check the replication error log:

```sql
SELECT *
FROM system.replication_queue
WHERE last_exception != ''
ORDER BY last_attempt_time DESC
LIMIT 20;
```

Common causes:
- Network partition that caused a split-brain write
- Manual DDL run on only one replica
- Disk corruption on one replica

## Resolving Part-Level Divergence

For a single bad part, move it aside on the diverged replica so it will be re-fetched from a healthy replica. Note that `ALTER TABLE ... DETACH PART` is a replicated operation and would detach the part on every replica, so it cannot be used here. Use a filesystem-level move on the affected replica only:

```bash
# Identify the bad part name from the comparison above
PART_NAME="20240101_1_1_0"
TABLE="events"
DB="default"
```

```sql
-- On the diverged replica, stop fetches so the part directory is quiescent
SYSTEM STOP FETCHES default.events;
```

```bash
# On the diverged replica's host, move the bad part into the detached directory
mv /var/lib/clickhouse/data/${DB}/${TABLE}/${PART_NAME} \
   /var/lib/clickhouse/data/${DB}/${TABLE}/detached/${PART_NAME}
```

```sql
-- Resume fetches and force the replica to reconcile with Keeper
SYSTEM START FETCHES default.events;
SYSTEM RESTART REPLICA default.events;
```

The replica sees the part as missing, queues a `GET_PART` task, and fetches a healthy copy from a peer. Monitor the queue:

```sql
SELECT * FROM system.replication_queue WHERE table = 'events';
```

## Full Replica Rebuild

If divergence is widespread, rebuild the replica from scratch:

```sql
-- On the diverged replica, drop and recreate
DROP TABLE events;

-- Recreate with the same ReplicatedMergeTree path
CREATE TABLE events ... ENGINE = ReplicatedMergeTree('/clickhouse/tables/shard1/events', 'replica2') ...;
```

The table refetches all parts from healthy replicas. Monitor `absolute_delay` in `system.replicas` until it reaches zero.

## Monitoring

Configure [OneUptime](https://oneuptime.com) to alert when `system.replication_queue` contains entries with non-empty `last_exception` for more than 10 minutes. This catches divergence early, before it becomes widespread.

## Summary

Replication divergence in ClickHouse is fixed by detaching bad parts or rebuilding the replica. Always identify the root cause to prevent recurrence, and monitor the replication queue for errors daily.
