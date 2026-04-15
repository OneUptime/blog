# How to Use system.detached_parts in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.detached_parts, MergeTree, Part Management, Storage

Description: Learn how to use the system.detached_parts table in ClickHouse to view, manage, and clean up detached data parts from MergeTree tables.

---

ClickHouse MergeTree tables store data in immutable parts on disk. Sometimes parts become detached - either manually by administrators or automatically due to corruption, replication conflicts, or version mismatches. The `system.detached_parts` table gives you visibility into all detached parts and helps you decide what to do with them.

## What Are Detached Parts?

A detached part is a data directory that still exists on disk but is no longer active in the table's metadata. Detached parts do not participate in queries. They accumulate in the `detached/` subdirectory of the table's data folder.

Common reasons for detachment:
- Manual `ALTER TABLE ... DETACH PART` during maintenance
- Replication conflicts where the receiving replica rejects a part
- Broken parts detected during startup or background checks

## Query system.detached_parts

```sql
SELECT
    database,
    table,
    partition_id,
    name,
    reason,
    modification_time,
    bytes_on_disk,
    formatReadableSize(bytes_on_disk) AS size
FROM system.detached_parts
ORDER BY modification_time DESC;
```

## Find Large Detached Parts

Detached parts can accumulate and waste significant disk space:

```sql
SELECT
    database,
    table,
    name,
    reason,
    formatReadableSize(bytes_on_disk) AS size,
    modification_time
FROM system.detached_parts
ORDER BY bytes_on_disk DESC
LIMIT 20;
```

## Filter by Reason

The `reason` column tells you why a part was detached:

```sql
SELECT
    table,
    name,
    reason,
    modification_time
FROM system.detached_parts
WHERE reason IN ('broken', 'unexpected', 'noquorum')
ORDER BY modification_time DESC;
```

Common reason values:
- `''` (empty string) - manually detached by user
- `broken` - corruption detected
- `unexpected` - found on disk but not in replica metadata
- `noquorum` - part did not meet quorum requirements
- `merge-not-byte-identical` - merge result differs from expected part

## Reattaching a Detached Part

If a part was detached manually and you want to bring it back:

```sql
ALTER TABLE events ATTACH PART '20240101_1_1_0';
```

Verify it is active again:

```sql
SELECT name, active
FROM system.parts
WHERE table = 'events'
  AND name = '20240101_1_1_0';
```

## Dropping Detached Parts

Once you are sure a detached part is safe to remove:

```sql
ALTER TABLE events DROP DETACHED PART '20240101_1_1_0'
SETTINGS allow_drop_detached = 1;
```

To drop all detached parts for a partition:

```sql
ALTER TABLE events DROP DETACHED PARTITION '20240101'
SETTINGS allow_drop_detached = 1;
```

## Automate Cleanup of Old Detached Parts

Detached parts from replication or broken state are often safe to delete after a retention window. A useful monitoring query:

```sql
SELECT
    database,
    table,
    count() AS detached_count,
    formatReadableSize(sum(bytes_on_disk)) AS total_size,
    min(modification_time) AS oldest
FROM system.detached_parts
GROUP BY database, table
HAVING oldest < now() - INTERVAL 7 DAY;
```

Review the output before deleting to ensure no legitimate parts are included.

## Summary

The `system.detached_parts` table in ClickHouse provides a complete inventory of all parts that have been removed from active use but remain on disk. Use it to audit disk usage, investigate replication or corruption issues, selectively reattach useful parts, and clean up stale data. Regular monitoring of detached parts is a good practice for maintaining healthy MergeTree storage.
