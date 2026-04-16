# How to Fix 'Part is broken' Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Corruption, Storage, Troubleshooting, Recovery

Description: Recover from ClickHouse 'Part is broken' errors by identifying corrupt data parts, detaching them, and restoring from replicas or backups.

---

## Understanding the Error

ClickHouse stores table data in "parts" - immutable directories on disk. When a part fails its checksum validation or is physically damaged, you see:

```text
DB::Exception: Part data/analytics/events/20240115_1_5_2 is broken. (CORRUPTED_DATA)
```

Broken parts can result from disk failures, hardware errors, incomplete writes (crash during merge), or filesystem corruption.

## Identifying Broken Parts

```sql
-- Check the parts_to_check count for each table
SELECT
    database,
    table,
    replica_name,
    parts_to_check,
    queue_size
FROM system.replicas
WHERE parts_to_check > 0;

-- Find all detached parts (often contain broken data)
SELECT
    database,
    table,
    name,
    reason,
    modification_time
FROM system.detached_parts
ORDER BY modification_time DESC;

-- Check active parts with check results
CHECK TABLE analytics.events;
```

## Verifying Part Integrity

```bash
# Check the part directory on disk
ls -la /var/lib/clickhouse/data/analytics/events/20240115_1_5_2/

# Verify checksums manually
clickhouse-local --query "
SELECT * FROM file('/var/lib/clickhouse/data/analytics/events/20240115_1_5_2/checksums.txt', 'TSV')
"
```

## Fix 1 - Let Replication Heal the Part

On a replicated table, ClickHouse will automatically re-fetch a broken part from a healthy replica:

```sql
-- Check if the part is being recovered
SELECT
    type,
    new_part_name,
    source_replica,
    last_exception
FROM system.replication_queue
WHERE table = 'events'
  AND type = 'GET_PART';

-- Force a sync if needed
SYSTEM SYNC REPLICA analytics.events;
```

## Fix 2 - Detach the Broken Part

If the part is blocking queries:

```bash
# Move the broken part to the detached directory
clickhouse-client --query "
ALTER TABLE analytics.events DETACH PART '20240115_1_5_2'
"
```

```sql
-- On a replicated table, the part will be re-fetched automatically
-- Verify the part was replaced
SELECT name, bytes_on_disk, modification_time
FROM system.parts
WHERE table = 'events' AND name LIKE '20240115_1_5_2%';
```

## Fix 3 - Drop the Detached Broken Part

After replication has provided a healthy replacement:

```sql
-- Remove the detached broken part from disk
ALTER TABLE analytics.events
DROP DETACHED PART '20240115_1_5_2';

-- Confirm it is gone
SELECT name FROM system.detached_parts
WHERE table = 'events';
```

## Fix 4 - Restore from Backup

If this is a non-replicated table or all replicas have the broken part:

```bash
# Using clickhouse-backup tool
clickhouse-backup restore --table analytics.events 2024-01-10T00-00-00

# Or manually copy parts from backup
cp -r /backup/analytics/events/20240115_1_5_2 \
      /var/lib/clickhouse/data/analytics/events/detached/

# Then attach the restored part
clickhouse-client --query "
ALTER TABLE analytics.events ATTACH PART '20240115_1_5_2'
"
```

## Prevention

### Enable Checksums for All Parts

Checksums are always written for MergeTree parts (see the `checksums.txt` file in each part directory). Verify that parts have computed hashes:

```sql
SELECT name, hash_of_all_files, hash_of_uncompressed_files
FROM system.parts
WHERE table = 'events' AND active
LIMIT 5;
```

### Monitor Disk Health

```bash
#!/bin/bash
# Check disk health with SMART
smartctl -H /dev/nvme0n1

# Monitor ClickHouse error log for checksum failures
tail -f /var/log/clickhouse-server/clickhouse-server.err.log | grep -i "checksum\|corrupt\|broken"
```

### Run Periodic Integrity Checks

```bash
#!/bin/bash
# Script to check all tables weekly
clickhouse-client --query "
SELECT database, name
FROM system.tables
WHERE engine LIKE '%MergeTree%'
" | while IFS=$'\t' read -r db table; do
    echo "Checking $db.$table..."
    clickhouse-client --query "CHECK TABLE $db.$table" 2>&1
done
```

## Summary

"Part is broken" errors in ClickHouse indicate physical data corruption on a storage part. For replicated tables, ClickHouse automatically re-fetches the broken part from a healthy replica - use `SYSTEM SYNC REPLICA` to accelerate this. For non-replicated tables or cases where all replicas are affected, detach the broken part and restore it from a backup. Prevent future occurrences with regular `CHECK TABLE` runs and disk health monitoring.
