# How to Fix 'No free disk space' Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disk Space, Storage, Troubleshooting, Operation

Description: Learn how to resolve ClickHouse 'No free disk space' errors by identifying space consumers, cleaning up data, and configuring storage policies.

---

## Understanding the Error

ClickHouse throws this error when it cannot write new data parts during INSERT or merge operations:

```text
DB::Exception: Not enough free disk space. (NOT_ENOUGH_SPACE)
```

ClickHouse requires free space not only for new inserts but also for background merges, which can temporarily double the size of a partition being merged.

## Identifying Space Consumers

### Check Disk Usage by Table

```sql
-- Find the largest tables on disk
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size_on_disk,
    sum(rows) AS total_rows,
    count() AS part_count
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 20;
```

### Check Part Accumulation

Many small unmerged parts waste space and slow queries:

```sql
-- Tables with the most parts (indicates merge lag)
SELECT
    database,
    table,
    count() AS part_count,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY part_count DESC
LIMIT 10;
```

### Check Disk-Level Usage

```bash
# Overall disk usage
df -h /var/lib/clickhouse

# Detailed breakdown by directory
du -sh /var/lib/clickhouse/data/*/*
du -sh /var/lib/clickhouse/tmp/
```

## Quick Fixes

### Drop Unused Partitions

```sql
-- See all partitions for a table
SELECT
    partition,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE database = 'analytics' AND table = 'events' AND active = 1
GROUP BY partition
ORDER BY partition;

-- Drop old partitions
ALTER TABLE analytics.events DROP PARTITION '2023-01';
ALTER TABLE analytics.events DROP PARTITION '2023-02';
```

### Clear the Temporary Directory

ClickHouse leaves temporary files from failed merges:

```bash
# Identify large temp files
ls -lhS /var/lib/clickhouse/tmp/

# Remove files older than 1 day (stop clickhouse first if safe)
find /var/lib/clickhouse/tmp/ -type f -mtime +1 -delete
```

### Truncate or Drop Tables You No Longer Need

```sql
-- Truncate a table (removes all data, keeps schema)
TRUNCATE TABLE analytics.debug_logs;

-- Drop a table entirely
DROP TABLE IF EXISTS analytics.temp_staging;
```

## Long-Term Solutions

### Configure TTL for Automatic Expiry

```sql
-- Add TTL to automatically delete old rows
ALTER TABLE analytics.events
MODIFY TTL event_date + INTERVAL 90 DAY;

-- Force TTL merges immediately
ALTER TABLE analytics.events
MATERIALIZE TTL;
```

### Use ClickHouse Storage Policies (Tiered Storage)

Move cold data to cheaper disks automatically:

```xml
<!-- /etc/clickhouse-server/config.d/storage.xml -->
<storage_configuration>
  <disks>
    <hot>
      <path>/nvme/clickhouse/</path>
      <keep_free_space_bytes>10737418240</keep_free_space_bytes>
    </hot>
    <cold>
      <path>/hdd/clickhouse/</path>
    </cold>
  </disks>
  <policies>
    <tiered>
      <volumes>
        <hot_volume>
          <disk>hot</disk>
          <max_data_part_size_bytes>1073741824</max_data_part_size_bytes>
        </hot_volume>
        <cold_volume>
          <disk>cold</disk>
        </cold_volume>
      </volumes>
    </tiered>
  </policies>
</storage_configuration>
```

Apply the policy to a table:

```sql
ALTER TABLE analytics.events
MODIFY SETTING storage_policy = 'tiered';
```

### Set Minimum Free Space Threshold

Prevent ClickHouse from filling the disk entirely:

```xml
<disks>
  <default>
    <keep_free_space_bytes>5368709120</keep_free_space_bytes>
  </default>
</disks>
```

## Monitoring

```sql
-- Monitor free disk space over time
SELECT
    event_time,
    metric,
    value
FROM system.asynchronous_metric_log
WHERE metric = 'DiskAvailable_default'
ORDER BY event_time DESC
LIMIT 50;
```

## Summary

ClickHouse "No free disk space" errors arise when merges, inserts, or temporary files exhaust available storage. Immediate relief comes from dropping old partitions and clearing temp files. Long-term, configure TTL policies for automatic data expiry and use tiered storage to offload cold data to larger, cheaper disks. Always keep at least 10-20% free space on ClickHouse volumes to allow background merges to complete.
