# How to Monitor ClickHouse Disk Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disk, Storage, Monitoring, MergeTree, Administration

Description: Learn how to monitor ClickHouse disk usage at the table, partition, and volume level using system tables, set up disk usage alerts, and configure TTL policies to reclaim space automatically.

---

Running out of disk space is one of the most disruptive failure modes for a ClickHouse cluster: inserts stall, merges halt, and the server can become read-only. Monitoring disk usage proactively and understanding which tables and partitions are growing fastest lets you act before capacity is exhausted.

## Checking Overall Disk Space

Use `system.disks` to get a summary of all configured disks:

```sql
SELECT
    name,
    path,
    formatReadableSize(free_space)     AS free,
    formatReadableSize(total_space)    AS total,
    formatReadableSize(total_space - free_space) AS used,
    round((1 - free_space / total_space) * 100, 1) AS used_pct
FROM system.disks
ORDER BY used_pct DESC;
```

Check all storage volumes and their policies:

```sql
SELECT
    policy_name,
    volume_name,
    volume_priority,
    disks,
    formatReadableSize(max_data_part_size) AS max_part_size,
    move_factor
FROM system.storage_policies;
```

## Disk Usage by Table

Find the largest tables across all databases:

```sql
SELECT
    database,
    table,
    count()                                          AS part_count,
    sum(rows)                                        AS total_rows,
    formatReadableSize(sum(data_compressed_bytes))   AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_compressed_bytes) / sum(data_uncompressed_bytes) * 100, 1) AS compression_pct
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(data_compressed_bytes) DESC
LIMIT 20;
```

## Disk Usage by Partition

Drill into partition-level disk usage to identify old data that can be dropped:

```sql
SELECT
    database,
    table,
    partition,
    count()                                        AS part_count,
    min(min_date)                                  AS min_date,
    max(max_date)                                  AS max_date,
    sum(rows)                                      AS rows,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed_size
FROM system.parts
WHERE
    active = 1
    AND database = 'your_database'
    AND table    = 'your_table'
GROUP BY database, table, partition
ORDER BY min(min_date);
```

## Monitoring Disk Growth Over Time

Create a disk usage snapshot table to track growth trends:

```sql
CREATE TABLE disk_usage_history
(
    snapshot_time DateTime DEFAULT now(),
    disk_name     String,
    total_bytes   UInt64,
    used_bytes    UInt64,
    free_bytes    UInt64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(snapshot_time)
ORDER BY (disk_name, snapshot_time)
TTL snapshot_time + INTERVAL 180 DAY;
```

Populate it via a scheduled script:

```bash
#!/bin/bash
# /usr/local/bin/record-disk-usage.sh
clickhouse-client --query "
INSERT INTO disk_usage_history (disk_name, total_bytes, used_bytes, free_bytes)
SELECT
    name,
    total_space,
    total_space - free_space,
    free_space
FROM system.disks
"
```

Schedule with cron:

```bash
# Run every 5 minutes
*/5 * * * * /usr/local/bin/record-disk-usage.sh >> /var/log/clickhouse-disk-usage.log 2>&1
```

Query the growth trend:

```sql
SELECT
    toStartOfHour(snapshot_time) AS hour,
    disk_name,
    max(used_bytes) AS used_bytes,
    formatReadableSize(max(used_bytes)) AS used_human,
    round((max(used_bytes) - min(used_bytes)) / 1024 / 1024, 1) AS growth_mb
FROM disk_usage_history
WHERE snapshot_time >= now() - INTERVAL 24 HOUR
GROUP BY hour, disk_name
ORDER BY hour, disk_name;
```

## Alerting on Disk Usage

Set up a shell-based alert that sends a notification when disk usage exceeds a threshold:

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-disk-alert.sh
THRESHOLD=85
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

result=$(clickhouse-client --format TabSeparated --query "
SELECT name, round((1 - free_space / total_space) * 100, 1) AS used_pct
FROM system.disks
WHERE (1 - free_space / total_space) * 100 > ${THRESHOLD}
")

if [ -n "$result" ]; then
    message="ClickHouse disk usage alert on $(hostname):\n${result}"
    curl -s -X POST "$SLACK_WEBHOOK" \
        -H 'Content-type: application/json' \
        --data "{\"text\": \"${message}\"}"
fi
```

## Configuring TTL to Reclaim Space Automatically

Set a table-level TTL so old data is deleted automatically:

```sql
-- Add TTL to an existing table: delete data older than 90 days
ALTER TABLE events
    MODIFY TTL event_date + INTERVAL 90 DAY;

-- Move data older than 30 days to a cold (slower/cheaper) disk
ALTER TABLE events
    MODIFY TTL
        event_date + INTERVAL 30 DAY TO DISK 'cold_disk',
        event_date + INTERVAL 90 DAY DELETE;
```

Check TTL configuration on existing tables:

```sql
SELECT
    database,
    name,
    engine,
    create_table_query
FROM system.tables
WHERE create_table_query LIKE '%TTL%'
ORDER BY database, name;
```

Force TTL evaluation immediately on a specific table:

```bash
clickhouse-client --query "OPTIMIZE TABLE events FINAL"
```

## Dropping Partitions to Free Space

When disk usage is critical and TTL cannot act fast enough, drop specific partitions manually:

```sql
-- Show partitions with their sizes before dropping
SELECT
    partition,
    count() AS parts,
    sum(rows) AS rows,
    formatReadableSize(sum(data_compressed_bytes)) AS size
FROM system.parts
WHERE active = 1 AND database = 'logs' AND table = 'access_log'
GROUP BY partition
ORDER BY partition;

-- Drop a partition
ALTER TABLE logs.access_log DROP PARTITION '202401';

-- Drop multiple partitions in sequence
ALTER TABLE logs.access_log DROP PARTITION '202310';
ALTER TABLE logs.access_log DROP PARTITION '202311';
ALTER TABLE logs.access_log DROP PARTITION '202312';
```

## Disk Usage Prometheus Metrics

If using the clickhouse-exporter, these are the key disk metrics to alert on:

```text
# Available space in bytes on each named disk
ClickHouseAsyncMetrics_DiskAvailable_default
ClickHouseAsyncMetrics_DiskAvailable_cold

# Used space in bytes on each named disk
ClickHouseAsyncMetrics_DiskUsed_default
ClickHouseAsyncMetrics_DiskUsed_cold
```

Example PromQL alert for disk at 90% capacity:

```text
(
  ClickHouseAsyncMetrics_DiskUsed_default
  / (ClickHouseAsyncMetrics_DiskUsed_default + ClickHouseAsyncMetrics_DiskAvailable_default)
) > 0.90
```

## Summary

Monitoring ClickHouse disk usage requires checking `system.disks` for free and total space, `system.parts` for per-table and per-partition usage, and tracking growth trends in a dedicated history table. Proactive TTL policies and partition-based lifecycle management are the primary tools for keeping disk usage under control. Combine a Prometheus alert at 85% capacity with automated TTL on all time-series tables to ensure you always have headroom for incoming writes and merge operations.
