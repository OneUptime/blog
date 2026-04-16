# How to Handle Disk Full Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disk Full, Troubleshooting, Storage, Operation

Description: Learn how to diagnose and resolve ClickHouse disk full errors quickly, recover write availability, and prevent recurrence.

---

A disk full condition on a ClickHouse server immediately blocks all writes and can cause replication failures. Fast diagnosis and recovery are critical to restore service.

## Symptoms of Disk Full

Common error messages in ClickHouse logs:

```text
DB::Exception: Not enough space to create data directory
DB::Exception: Cannot reserve ... bytes, have only ... bytes free
Code: 28. DB::Exception: No space left on device
```

## Step 1: Identify Disk Usage

Quickly find what is consuming disk space:

```bash
# Check filesystem usage
df -h /var/lib/clickhouse

# Find largest directories
du -sh /var/lib/clickhouse/*/ | sort -hr | head -20

# Check ClickHouse data directories
du -sh /var/lib/clickhouse/data/*/ | sort -hr | head -20
```

From ClickHouse:

```sql
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 10;
```

## Step 2: Identify Detached and Frozen Parts

Detached and frozen parts are not active data and can be cleaned up:

```bash
# Check detached parts
du -sh /var/lib/clickhouse/data/*/*/detached/ 2>/dev/null | grep -v "^0"

# Check frozen parts (from ALTER TABLE FREEZE)
du -sh /var/lib/clickhouse/shadow/ 2>/dev/null
```

```sql
-- List detached parts
SELECT database, table, sum(bytes_on_disk) AS size
FROM system.detached_parts
GROUP BY database, table
ORDER BY size DESC;
```

## Step 3: Immediate Space Recovery

Free space quickly:

```bash
# Remove frozen snapshots (verify they are not needed for DR)
rm -rf /var/lib/clickhouse/shadow/old_snapshot_name/

# Remove old ClickHouse logs
find /var/log/clickhouse-server/ -name "*.gz" -mtime +7 -delete
truncate -s 0 /var/log/clickhouse-server/clickhouse-server.log
```

Drop detached parts that are not needed (the `allow_drop_detached` setting must be enabled):

```sql
ALTER TABLE my_database.events DROP DETACHED PARTITION ID 'all' SETTINGS allow_drop_detached = 1;
```

## Step 4: Delete Old Data Partitions

If application data can be deleted, drop old partitions:

```sql
-- Check which partitions exist
SELECT partition, formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition
ORDER BY partition;

-- Drop oldest partition to free space
ALTER TABLE events DROP PARTITION '202501';
```

## Step 5: Compress Tables

Force compression of uncompressed data:

```sql
OPTIMIZE TABLE events FINAL;
```

## Preventing Future Disk Full Events

Set up alerts before disks fill up:

```sql
-- Alert query for monitoring systems
SELECT
    name,
    round((total_space - free_space) / total_space * 100, 1) AS used_pct
FROM system.disks
WHERE (total_space - free_space) / total_space * 100 > 80;
```

Configure TTL policies to automatically expire old data:

```sql
ALTER TABLE events MODIFY TTL event_time + INTERVAL 90 DAY DELETE;
```

Set storage move policies to automatically tier data to cheaper storage.

## Configuring Reserved Space

Prevent ClickHouse from filling a disk completely by reserving space:

```xml
<storage_configuration>
    <disks>
        <default>
            <type>local</type>
            <path>/var/lib/clickhouse/</path>
            <keep_free_space_bytes>10737418240</keep_free_space_bytes>
        </default>
    </disks>
</storage_configuration>
```

`keep_free_space_bytes` reserves 10GB and prevents ClickHouse from writing data that would consume it.

## Summary

ClickHouse disk full errors require fast response: identify the culprit directories, remove detached and frozen parts, drop old partitions if allowed, and consider adding storage or tiering data offsite. Prevent recurrence with monitoring alerts at 80% utilization, TTL DELETE policies for data expiration, and `keep_free_space_bytes` as a safety buffer.
