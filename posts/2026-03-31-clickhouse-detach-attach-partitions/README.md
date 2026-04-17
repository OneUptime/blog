# How to Detach and Attach Partitions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, ALTER TABLE, Partition, Detach, Attach

Description: Learn how to detach and attach partitions in ClickHouse for archival, quick data removal, and cross-table transfers using the detached directory.

---

Detaching a partition in ClickHouse removes it from the table's active data without deleting the underlying files. The partition data is moved to a special `detached/` subdirectory on disk where it remains until you either attach it back, move it elsewhere, or delete it manually. This mechanism is the foundation for several important data management patterns: quick partition removal, cross-server data transfers, and safe archival without permanent deletion.

## DETACH PARTITION

```sql
ALTER TABLE events
    DETACH PARTITION 202401;
```

After this command:
- The partition is invisible to queries on `events`.
- The data files are physically present in `detached/<partition_id>/` on each replica's disk.
- The partition can be re-attached at any time.

To detach every partition at once, use `DETACH PARTITION ALL`. To detach a single part by name (rather than a whole partition), use `DETACH PART '<part_name>'`. To detach the entire table, use `DETACH TABLE` instead.

## Listing Detached Partitions

```sql
SELECT
    database,
    table,
    partition_id,
    name,
    disk,
    bytes_on_disk
FROM system.detached_parts
WHERE database = 'default'
  AND table = 'events'
ORDER BY partition_id;
```

## ATTACH PARTITION

Re-attaches a previously detached (or manually placed) partition:

```sql
ALTER TABLE events
    ATTACH PARTITION 202401;
```

ClickHouse reads the data from the `detached/` directory, verifies checksums, and makes the parts active. Queries can immediately use the data.

## ATTACH PARTITION FROM Another Table

Copies (not moves) a partition from one table to another. The source partition remains active in the source table:

```sql
ALTER TABLE events_archive
    ATTACH PARTITION 202401 FROM events;
```

Both tables must have compatible schemas (same column names, types, and ordering key).

## Use Cases

### Quick Partition Drop with Recovery Option

Instead of using `DROP PARTITION` (which permanently deletes data), use `DETACH PARTITION` when you are not certain the data should be permanently removed:

```sql
-- Remove partition from active queries without permanent deletion
ALTER TABLE events
    DETACH PARTITION 202401;

-- If needed, restore it
ALTER TABLE events
    ATTACH PARTITION 202401;

-- If confirmed unnecessary, drop the detached partition to free disk space
-- (Use ALTER TABLE ... DROP DETACHED PARTITION, shown later)
```

### Archival Workflow

```sql
-- Move old partition off the hot table
ALTER TABLE events
    DETACH PARTITION 202312;

-- Manually copy detached directory to cold storage or another server:
-- rsync /var/lib/clickhouse/data/default/events/detached/ cold-server:/data/archive/

-- On cold server: attach detached parts to an archive table with same schema
ALTER TABLE events_archive
    ATTACH PARTITION 202312;
```

### Reinserting Corrected Data

```sql
-- Detach a partition with bad data
ALTER TABLE events
    DETACH PARTITION 202403;

-- Fix data in a staging table
INSERT INTO events_staging SELECT * FROM events_detached_backup
WHERE toYYYYMM(created_at) = 202403;

-- After corrections, drop the corrupted detached part and attach corrected data
ALTER TABLE events
    DROP DETACHED PARTITION 202403;

ALTER TABLE events
    ATTACH PARTITION 202403 FROM events_staging;
```

## Complete Example

```sql
CREATE TABLE web_logs
(
    request_id UUID DEFAULT generateUUIDv4(),
    host       String,
    path       String,
    status     UInt16,
    logged_at  DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(logged_at)
ORDER BY (host, logged_at);

-- Simulate existing data
INSERT INTO web_logs (host, path, status, logged_at)
SELECT
    'example.com',
    '/api/v1',
    200,
    toDateTime('2024-01-01') + toIntervalSecond(number)
FROM numbers(1000);

-- Detach January 2024 partition
ALTER TABLE web_logs
    DETACH PARTITION 202401;

-- Confirm detached state
SELECT * FROM system.detached_parts
WHERE table = 'web_logs';

-- Confirm active data count is now 0 for that month
SELECT toYYYYMM(logged_at) AS month, count()
FROM web_logs
GROUP BY month;

-- Re-attach
ALTER TABLE web_logs
    ATTACH PARTITION 202401;

-- Confirm data is back
SELECT toYYYYMM(logged_at) AS month, count()
FROM web_logs
GROUP BY month;
```

## Dropping Detached Parts

To permanently remove detached parts (freeing disk space):

```sql
-- Drop a specific detached partition
ALTER TABLE web_logs
    DROP DETACHED PARTITION 202401;

-- Drop a specific detached part by name
ALTER TABLE web_logs
    DROP DETACHED PART 'all_1_1_0';
```

There is no single SYSTEM-level command to purge every detached part at once. To bulk-clean detached data, query `system.detached_parts` to enumerate them and issue per-partition or per-part `DROP DETACHED` statements. Note that `DROP DETACHED` may require the `allow_drop_detached` setting to be enabled on older ClickHouse versions.

## ON CLUSTER for Distributed Setups

```sql
ALTER TABLE web_logs ON CLUSTER '{cluster}'
    DETACH PARTITION 202401;

ALTER TABLE web_logs ON CLUSTER '{cluster}'
    ATTACH PARTITION 202401;
```

In replicated setups, detach/attach operations must be coordinated - the Keeper/ZooKeeper quorum tracks replica state and will sync the operation across replicas.

## Summary

`DETACH PARTITION` removes a partition from active table data while preserving files in the `detached/` directory, providing a safe alternative to permanent deletion. `ATTACH PARTITION` reinstates detached data and also enables schema-compatible data transfers between tables. Use `system.detached_parts` to inventory detached data, and use `DROP DETACHED PARTITION` to reclaim disk space when detached data is no longer needed.
