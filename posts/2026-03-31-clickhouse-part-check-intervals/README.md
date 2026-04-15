# How to Configure ClickHouse Part Check Intervals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Part Check, Data Integrity, Replication, Configuration, MergeTree

Description: Configure ClickHouse part check intervals to balance data integrity verification with background resource usage on replicated MergeTree tables.

---

## What Are Part Checks?

ClickHouse periodically checks the integrity of data parts on disk. Each part is a directory containing column data files and checksums. Part checks verify that stored data matches the recorded checksums, catching silent data corruption or disk errors early.

## Relevant Settings

These are MergeTree table-level settings, configured in the `<merge_tree>` section of the server config:

```xml
<!-- config.xml -->
<merge_tree>
    <cleanup_delay_period>30</cleanup_delay_period>
    <merge_selecting_sleep_ms>5000</merge_selecting_sleep_ms>
</merge_tree>
```

Note: The `check_delay_period` MergeTree setting existed in older versions but is now obsolete and has no effect in current ClickHouse releases.

## Part Check Queue

For replicated tables, corrupt or missing parts are re-fetched from other replicas. You can monitor pending fetch operations in the replication queue:

```sql
SELECT
    table,
    type,
    create_time,
    required_quorum,
    source_replica
FROM system.replication_queue
WHERE type = 'GET_PART'
ORDER BY create_time DESC
LIMIT 20;
```

## Triggering Manual Part Checks

Force a check on a specific table:

```sql
CHECK TABLE my_table;
```

Check a specific partition:

```sql
CHECK TABLE my_table PARTITION '2026-03';
```

The output shows each part and whether it passed or failed:

```text
part_path                | is_passed | message
20260101_1_1000_5        | 1         |
20260101_1001_2000_5     | 0         | Checksum mismatch
```

## Handling Failed Parts

If a part fails the check:

1. On a non-replicated table, detach the corrupt part and restore from backup:

```sql
ALTER TABLE my_table DETACH PART '20260101_1001_2000_5';
```

2. On a replicated table, ClickHouse automatically fetches the correct part from another replica:

```sql
SYSTEM SYNC REPLICA my_table;
```

## Part Check Behavior

In current ClickHouse versions, the part check thread for replicated tables runs automatically and cannot be tuned via a single delay setting (the older `check_delay_period` setting is obsolete). ClickHouse checks parts when inconsistencies are detected during queries or replication, and automatically re-fetches corrupt parts from other replicas.

For non-replicated tables, use `CHECK TABLE` (shown above) on a schedule to verify integrity, and restore from backups if corruption is found.

## Monitoring Part Health

Track recently checked parts and errors:

```sql
SELECT
    table,
    count() AS parts,
    sum(bytes_on_disk) AS total_bytes,
    countIf(rows > 0) AS non_empty_parts
FROM system.parts
WHERE active AND database = 'default'
GROUP BY table;
```

To see parts currently being merged, query `system.merges`:

```sql
SELECT
    table,
    partition_id,
    progress,
    num_parts
FROM system.merges;
```

## Summary

ClickHouse automatically verifies part integrity and, on replicated tables, re-fetches corrupt parts from other replicas. Use `CHECK TABLE` to manually verify specific tables or partitions, and monitor `system.replication_queue` for pending fetch operations. For non-replicated tables, schedule periodic `CHECK TABLE` runs and maintain backups for recovery.
