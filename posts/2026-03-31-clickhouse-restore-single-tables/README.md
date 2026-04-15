# How to Restore Single Tables from ClickHouse Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Restore, Table Recovery, Disaster Recovery

Description: Learn how to restore individual tables from ClickHouse backups without restoring the entire database, minimizing downtime and resource usage.

---

When only one table is corrupted or accidentally dropped, restoring the entire database is wasteful and slow. ClickHouse's RESTORE command supports table-level granularity, letting you recover just the tables you need.

## Basic Single Table Restore

Restore a single table from a database backup:

```sql
RESTORE TABLE my_database.events
FROM Disk('backups', 'my_database_backup_2026-03-31/');
```

This works even when the backup contains the entire database - ClickHouse extracts only the requested table.

## Restoring to a Different Table Name

Restore to a new table name to avoid overwriting the existing table:

```sql
RESTORE TABLE my_database.events_recovered AS my_database.events
FROM Disk('backups', 'my_database_backup_2026-03-31/');
```

This is the safest approach - compare the recovered table with production before swapping.

## Restoring Multiple Tables at Once

Restore several related tables in a single command:

```sql
RESTORE TABLE analytics.sessions, analytics.page_views, analytics.conversions
FROM Disk('backups', 'analytics_backup_2026-03-31/');
```

## Handling Table Already Exists

If the table exists and you want to replace it, drop it first or use a different target name:

```sql
-- Option 1: Drop and restore
DROP TABLE my_database.events;
RESTORE TABLE my_database.events
FROM Disk('backups', 'my_database_backup_2026-03-31/');

-- Option 2: Restore to temp name and swap
RESTORE TABLE my_database.events_new AS my_database.events
FROM Disk('backups', 'my_database_backup_2026-03-31/');

-- Validate, then swap
RENAME TABLE my_database.events TO my_database.events_old,
             my_database.events_new TO my_database.events;
```

## Restoring Specific Partitions Only

If only certain partitions are corrupted, restore just those partitions:

```sql
RESTORE TABLE my_database.events PARTITIONS ('2026-03')
FROM Disk('backups', 'my_database_backup_2026-03-31/');
```

## Monitoring Table Restore Progress

For large tables, run the restore asynchronously and monitor it:

```sql
RESTORE ASYNC TABLE my_database.events_restored AS my_database.events
FROM Disk('backups', 'my_database_backup_2026-03-31/');

SELECT id, status, start_time, end_time, total_size, error
FROM system.backups
WHERE status IN ('RESTORING', 'RESTORED', 'RESTORE_FAILED')
ORDER BY start_time DESC
LIMIT 5;
```

## Verifying the Restored Table

After restoring, verify row counts and data integrity:

```sql
-- Compare counts
SELECT count() FROM my_database.events;
SELECT count() FROM my_database.events_restored;

-- Compare recent data
SELECT max(event_time) FROM my_database.events;
SELECT max(event_time) FROM my_database.events_restored;

-- Check data distribution
SELECT toDate(event_time) AS day, count()
FROM my_database.events_restored
GROUP BY day
ORDER BY day DESC
LIMIT 10;
```

## Summary

ClickHouse's RESTORE command supports table-level recovery from any database backup. Always restore to a new name first, validate the data, then swap if the restore looks correct. Use partition-level restores when only specific time ranges are affected. This approach minimizes downtime and avoids risking production data during recovery.
