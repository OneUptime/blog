# How to Restore ClickHouse from S3 Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Restore, Backup, AWS S3, Disaster Recovery, Administration

Description: Learn how to restore ClickHouse databases and tables from S3 backups using the native RESTORE command, handle incremental restore chains, and verify data integrity after restoration.

---

The ClickHouse native `RESTORE` command is the counterpart to `BACKUP` and supports restoring from S3 directly. Restoration can target an empty server (full disaster recovery), a new database (parallel validation), or specific tables (partial recovery). This guide covers every restore scenario.

## Prerequisites

Verify that the backup exists and is accessible before starting a restore:

```bash
# List available backups
aws s3 ls s3://your-backup-bucket/clickhouse/backups/ --recursive | grep '\.backup$'

# Check the backup manifest
aws s3 cp s3://your-backup-bucket/clickhouse/backups/2026-03-31-full/.backup /tmp/backup-manifest.json
python3 -m json.tool /tmp/backup-manifest.json | head -40
```

Verify your ClickHouse version matches or is compatible with the backup:

```sql
SELECT version();
-- RESTORE requires the same major.minor version or newer
```

## Full Database Restore

Restore an entire database from a full backup:

```sql
RESTORE DATABASE my_database
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-full/my_database/');
```

If the database already exists, use `RESTORE ... REPLACE TABLE` or restore into a new database:

```sql
-- Restore into a new database name
RESTORE DATABASE my_database AS my_database_restored
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-full/my_database/');
```

## Restoring a Single Table

```sql
-- Restore a specific table
RESTORE TABLE my_database.events
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-full/my_database/');

-- Restore into a different table name
RESTORE TABLE my_database.events AS my_database.events_restored
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-full/my_database/');
```

## Restoring from an Incremental Backup Chain

When restoring from an incremental backup, ClickHouse automatically follows the `base_backup` chain. You only need to specify the most recent incremental backup:

```sql
-- ClickHouse resolves the chain automatically:
-- incr-2026-03-31 -> incr-2026-03-30 -> ... -> base-2026-03-24
RESTORE DATABASE my_database
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-incr/my_database/');
```

If the chain references multiple S3 paths, you may need to provide each explicitly:

```sql
RESTORE DATABASE my_database
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-incr/my_database/')
SETTINGS base_backup = S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-24-full/my_database/');
```

## Asynchronous Restore for Large Databases

```sql
-- Start restore asynchronously
RESTORE ASYNC DATABASE my_database
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-full/my_database/');

-- Monitor progress
SELECT
    id,
    status,
    name,
    start_time,
    num_files,
    files_read,
    round(files_read * 100.0 / nullIf(num_files, 0), 1) AS progress_pct,
    formatReadableSize(total_size) AS total_size,
    formatReadableSize(bytes_read) AS bytes_read,
    error
FROM system.backups
WHERE status IN ('RESTORING', 'RESTORED', 'RESTORE_FAILED')
ORDER BY start_time DESC
LIMIT 5;
```

## Disaster Recovery: Full Server Restore

For a full server recovery (e.g., replacing a crashed server with a fresh installation):

```bash
# Step 1: Install ClickHouse on the new server
sudo apt-get install -y clickhouse-server clickhouse-client

# Step 2: Copy the original server configuration
# (Or restore from your config management - Ansible, Chef, Terraform, etc.)

# Step 3: Start ClickHouse
sudo systemctl start clickhouse-server

# Step 4: Create the target databases
clickhouse-client --query "CREATE DATABASE IF NOT EXISTS my_database"

# Step 5: Restore from the latest full backup
clickhouse-client --query "
RESTORE ASYNC DATABASE my_database
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-24-full/my_database/');
"

# Step 6: Apply the latest incremental if available
clickhouse-client --query "
RESTORE ASYNC DATABASE my_database
FROM S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-incr/my_database/')
SETTINGS allow_non_empty_tables = true;
"
```

## Restoring to a Specific Point in Time

To restore to a specific date, restore the full backup from before that date and then apply each incremental backup up to the target date:

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-restore-to-date.sh
TARGET_DATE="${1:-2026-03-28}"
BUCKET="your-backup-bucket"
DATABASE="my_database"
BASE_DATE="2026-03-24"  # most recent full backup before target

echo "Restoring ${DATABASE} to ${TARGET_DATE}"

# Restore full backup
clickhouse-client --query "
CREATE DATABASE IF NOT EXISTS ${DATABASE}_restore_${TARGET_DATE//\-/};
RESTORE DATABASE ${DATABASE} AS ${DATABASE}_restore_${TARGET_DATE//\-/}
FROM S3('https://s3.us-east-1.amazonaws.com/${BUCKET}/clickhouse/backups/${BASE_DATE}-full/${DATABASE}/');
"

# Apply each incremental up to the target date
for DATE in $(seq 0 86400 $(($(date -d "$TARGET_DATE" +%s) - $(date -d "$BASE_DATE" +%s))) | \
             xargs -I{} date -d "$BASE_DATE + {} seconds" +%Y-%m-%d 2>/dev/null); do
    if [ "$DATE" = "$BASE_DATE" ]; then continue; fi
    echo "Applying incremental: ${DATE}"
    clickhouse-client --query "
    RESTORE DATABASE ${DATABASE} AS ${DATABASE}_restore_${TARGET_DATE//\-/}
    FROM S3('https://s3.us-east-1.amazonaws.com/${BUCKET}/clickhouse/backups/${DATE}-incr/${DATABASE}/')
    SETTINGS allow_non_empty_tables = true;
    " || echo "No incremental for ${DATE}, skipping"
done

echo "Restore complete"
```

## Verifying the Restore

After restoring, compare row counts between the original and restored tables:

```sql
-- Row counts in original
SELECT table, sum(rows) AS rows
FROM system.parts
WHERE database = 'my_database' AND active = 1
GROUP BY table
ORDER BY table;

-- Row counts in restored copy
SELECT table, sum(rows) AS rows
FROM system.parts
WHERE database = 'my_database_restored' AND active = 1
GROUP BY table
ORDER BY table;

-- Compare specific table data
SELECT count(), sum(amount), max(event_time)
FROM my_database.events
UNION ALL
SELECT count(), sum(amount), max(event_time)
FROM my_database_restored.events;
```

## Summary

ClickHouse restores from S3 using the `RESTORE` command, which mirrors the `BACKUP` syntax exactly. For incremental backup chains, ClickHouse follows the `base_backup` pointer automatically so you only need to specify the most recent backup. For disaster recovery, install a fresh ClickHouse instance, apply your server configuration, create the target databases, and then run `RESTORE` pointing at your S3 backup paths. Always verify row counts and spot-check data after restoration before cutting over production traffic.
