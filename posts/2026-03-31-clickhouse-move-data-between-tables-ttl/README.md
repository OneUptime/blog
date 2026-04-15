# How to Move Data Between Tables Using TTL in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TTL, Data Movement, MergeTree, Archival, Materialized View

Description: Use TTL expressions combined with materialized views and manual partition moves to automatically migrate data between ClickHouse tables.

---

ClickHouse TTL natively moves data between storage volumes or recompresses it, but it does not directly move rows between tables. There are three practical patterns for table-to-table data movement triggered by age: scheduled partition moves, INSERT SELECT with DROP PARTITION, and materialized views with time filters.

## Pattern 1 - Scheduled Partition Move

Maintain a hot table and an archive table with the same schema. A scheduled job moves old partitions from hot to archive.

```sql
CREATE TABLE events_hot
(
    event_time DateTime,
    user_id    UInt64,
    event_type String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);

CREATE TABLE events_archive
(
    event_time DateTime,
    user_id    UInt64,
    event_type String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id)
SETTINGS storage_policy = 'cold_s3';
```

Move last month's partition:

```sql
ALTER TABLE events_hot MOVE PARTITION '202401' TO TABLE events_archive;
```

`MOVE PARTITION TO TABLE` is atomic and zero-copy on the same disk. Across disks it copies then drops.

## Pattern 2 - INSERT SELECT + DROP PARTITION

For cross-cluster or cross-disk scenarios where zero-copy is not possible:

```sql
INSERT INTO events_archive
SELECT * FROM events_hot
WHERE toYYYYMM(event_time) = 202312;

ALTER TABLE events_hot DROP PARTITION '202312';
```

Run this as a scheduled task in your orchestration tool (Airflow, cron, etc.).

## Pattern 3 - Materialized View to Archive Table

Write to the hot table; a materialized view auto-inserts into the archive for rows older than a threshold using a near-real-time pattern:

```sql
CREATE MATERIALIZED VIEW mv_archive_old_events
TO events_archive
AS
SELECT event_time, user_id, event_type
FROM events_hot
WHERE event_time < now() - INTERVAL 90 DAY;
```

Note: materialized views only capture new inserts, not existing rows. Use this only for ongoing ingestion routing.

## Verifying the Move

```sql
SELECT
    table,
    toYYYYMM(min(event_time)) AS min_month,
    toYYYYMM(max(event_time)) AS max_month,
    count()                   AS rows
FROM merge('default', '^events_')
GROUP BY table;
```

## Scheduling with a Shell Script

```bash
#!/usr/bin/env bash
PARTITION=$(date -d "2 months ago" +%Y%m)
clickhouse-client -q "
  ALTER TABLE events_hot
  MOVE PARTITION '${PARTITION}' TO TABLE events_archive;
"
```

## Summary

Moving data between ClickHouse tables by age uses either `ALTER TABLE MOVE PARTITION TO TABLE` for atomic zero-copy moves on the same cluster, or an INSERT SELECT followed by DROP PARTITION for cross-cluster scenarios. Schedule these operations with your existing orchestration tool and monitor row counts in both tables to confirm completeness.
