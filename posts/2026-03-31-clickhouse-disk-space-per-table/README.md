# How to Monitor Disk Space Usage Per Table in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Disk Space, Monitoring, system.parts

Description: Learn how to monitor ClickHouse disk space usage broken down by table, partition, and disk to track growth and plan capacity.

---

ClickHouse provides detailed storage metrics in `system.parts` and `system.tables` that let you monitor disk usage per table, partition, and disk - essential for capacity planning and identifying unexpected growth.

## Total Disk Usage Per Table

Get a summary of disk usage sorted by largest tables:

```sql
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS compression_ratio,
    sum(rows) AS total_rows,
    count() AS part_count
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 20;
```

## Disk Usage Per Partition

Break down storage by partition to find which time ranges consume the most space:

```sql
SELECT
    database,
    table,
    partition,
    formatReadableSize(sum(bytes_on_disk)) AS partition_size,
    sum(rows) AS rows,
    count() AS parts
FROM system.parts
WHERE
    active = 1
    AND database = 'production'
    AND table = 'events'
GROUP BY database, table, partition
ORDER BY partition DESC
LIMIT 24;
```

## Disk Usage Per Volume/Disk

See how space is distributed across your storage tiers:

```sql
SELECT
    disk_name,
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    count() AS parts
FROM system.parts
WHERE active = 1
GROUP BY disk_name, database, table
ORDER BY disk_name, sum(bytes_on_disk) DESC;
```

## Tracking Growth Rate

Calculate how fast a table is growing:

```sql
SELECT
    toStartOfDay(event_time) AS day,
    formatReadableSize(sumIf(size_in_bytes, event_type = 'NewPart')) AS bytes_added,
    countIf(event_type = 'NewPart') AS parts_added
FROM system.part_log
WHERE
    database = 'production'
    AND table = 'events'
    AND event_time >= now() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day;
```

## Projecting Future Disk Usage

Based on current growth rate, project when you will run out of disk space:

```sql
WITH daily_growth AS (
    SELECT
        avg(bytes_per_day) AS avg_daily_bytes
    FROM (
        SELECT
            toDate(event_time) AS day,
            sum(size_in_bytes) AS bytes_per_day
        FROM system.part_log
        WHERE
            event_type = 'NewPart'
            AND event_time >= now() - INTERVAL 30 DAY
        GROUP BY day
    )
),
current_usage AS (
    SELECT sum(bytes_on_disk) AS used_bytes
    FROM system.parts
    WHERE active = 1 AND database = 'production'
),
disk_info AS (
    SELECT free_space, total_space
    FROM system.disks
    WHERE name = 'default'
)
SELECT
    formatReadableSize(current_usage.used_bytes) AS current_usage,
    formatReadableSize(disk_info.free_space) AS free_space,
    formatReadableSize(daily_growth.avg_daily_bytes) AS daily_growth,
    round(disk_info.free_space / daily_growth.avg_daily_bytes) AS days_until_full
FROM daily_growth, current_usage, disk_info;
```

## Setting Up Disk Space Alerts

Create a query for Grafana or Prometheus alerting:

```sql
SELECT
    name AS disk_name,
    round((total_space - free_space) / total_space * 100, 1) AS used_percent,
    formatReadableSize(free_space) AS free_space
FROM system.disks
WHERE used_percent > 80;
```

Alert when any disk exceeds 80% utilization.

## Summary

Monitoring ClickHouse disk space per table uses `system.parts` for current usage and `system.part_log` for growth trends. Break down usage by database, table, partition, and disk to understand where data lives. Use growth rate calculations to project capacity exhaustion dates and set up alerts before disks fill up.
