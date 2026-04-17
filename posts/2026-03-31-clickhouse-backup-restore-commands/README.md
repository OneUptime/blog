# How to Use BACKUP and RESTORE Commands in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Restore, BACKUP Command, Data Protection

Description: A practical guide to using ClickHouse's native BACKUP and RESTORE SQL commands to protect your data across disk and S3 destinations.

---

ClickHouse introduced native BACKUP and RESTORE commands in version 22.8. These SQL commands provide a straightforward way to create and restore backups without external tools, supporting local disk and object storage destinations.

## Basic Syntax

```sql
-- Backup a database
BACKUP DATABASE my_database TO Disk('backups', 'my_backup/');

-- Backup a table
BACKUP TABLE my_database.my_table TO Disk('backups', 'table_backup/');

-- Backup multiple tables
BACKUP TABLE db1.table1, db2.table2 TO Disk('backups', 'multi_backup/');

-- Restore a database
RESTORE DATABASE my_database FROM Disk('backups', 'my_backup/');

-- Restore a table
RESTORE TABLE my_database.my_table FROM Disk('backups', 'table_backup/');
```

## Configuring the Backup Disk

Before running BACKUP, configure an allowed backup disk in `config.d/backup.xml`:

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <backups>
                <type>local</type>
                <path>/mnt/backups/</path>
            </backups>
        </disks>
    </storage_configuration>
    <backups>
        <allowed_disk>backups</allowed_disk>
        <allowed_path>/</allowed_path>
    </backups>
</clickhouse>
```

## Backing Up Specific Partitions

Back up only certain partitions to minimize backup size:

```sql
BACKUP TABLE events PARTITIONS ('2026-03', '2026-02')
TO Disk('backups', 'events_q1_2026/');
```

## Running Async Backups

For large databases, run the backup asynchronously and monitor progress:

```sql
BACKUP DATABASE production TO Disk('backups', 'prod_backup/')
SETTINGS async = true;

-- Check progress
SELECT id, status, start_time, end_time, total_size, error
FROM system.backups
ORDER BY start_time DESC
LIMIT 5;
```

Status values: `CREATING_BACKUP`, `BACKUP_CREATED`, `BACKUP_FAILED`, `RESTORING`, `RESTORED`, `RESTORE_FAILED`.

## Restoring to a Different Name

Restore a backup under a new database or table name for testing without affecting production:

```sql
RESTORE DATABASE production AS production_test
FROM Disk('backups', 'prod_backup/');

RESTORE TABLE analytics.events AS analytics.events_restored
FROM Disk('backups', 'events_backup/');
```

## Backup to S3

Backup directly to S3 using the S3 function syntax:

```sql
BACKUP DATABASE production
TO S3('https://s3.us-east-1.amazonaws.com/my-bucket/backups/prod_2026-03-31/', 'ACCESS_KEY', 'SECRET_KEY');
```

## Restoring from S3

```sql
RESTORE DATABASE production
FROM S3('https://s3.us-east-1.amazonaws.com/my-bucket/backups/prod_2026-03-31/', 'ACCESS_KEY', 'SECRET_KEY');
```

## BACKUP Settings Reference

| Setting | Description | Default |
|---|---|---|
| `async` | Run backup in background | false |
| `deduplicate_files` | Reuse files across backups | true |
| `base_backup` | Source for incremental backup | - |
| `compression_method` | Compression algorithm (e.g. `lz4`, `zstd`) | none |

```sql
BACKUP DATABASE production TO Disk('backups', 'prod_backup/')
SETTINGS
    async = true,
    compression_method = 'zstd',
    compression_level = 3;
```

## Summary

ClickHouse's native BACKUP and RESTORE commands provide a clean SQL interface for database backup operations. Configure an allowed backup disk, use `async = true` for large databases, monitor via `system.backups`, and use `base_backup` for incrementals. The commands support local disk, S3, GCS, and Azure Blob destinations.
