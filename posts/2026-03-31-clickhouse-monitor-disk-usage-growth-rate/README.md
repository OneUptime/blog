# How to Monitor ClickHouse Disk Usage and Growth Rate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Monitoring, Disk Usage, Growth Rate, system.parts, Capacity Planning

Description: Monitor ClickHouse disk usage and project growth rate using system tables and Prometheus metrics to plan storage capacity before running out of space.

---

Running out of disk space in ClickHouse causes inserts to fail and merges to stall. Proactive monitoring of disk usage and growth trends lets you add capacity before problems occur.

## Current Disk Usage by Database and Table

```sql
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size,
    round(sum(bytes_on_disk) / sum(data_uncompressed_bytes), 3) AS compression_ratio,
    sum(rows) AS total_rows,
    count() AS part_count
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 20;
```

## Disk Usage by Partition

```sql
SELECT
    database,
    table,
    partition,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    sum(rows) AS rows,
    min(min_date) AS min_date,
    max(max_date) AS max_date
FROM system.parts
WHERE active = 1
  AND database = 'default'
GROUP BY database, table, partition
ORDER BY partition DESC;
```

## Free Disk Space

```sql
SELECT
    name,
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total,
    round(100.0 * (total_space - free_space) / total_space, 1) AS used_pct
FROM system.disks;
```

Alert when `used_pct > 80`.

## Track Growth Rate Over Time

Use `system.query_log` or a time-series table to record daily sizes:

```sql
-- Daily snapshot of table sizes (run as a scheduled job)
INSERT INTO disk_usage_history
SELECT
    now() AS recorded_at,
    database,
    table,
    sum(bytes_on_disk) AS bytes_on_disk
FROM system.parts
WHERE active = 1
GROUP BY database, table;
```

```sql
-- Calculate daily growth rate
SELECT
    database,
    table,
    formatReadableSize(max(bytes_on_disk) - min(bytes_on_disk)) AS growth_7d,
    formatReadableSize((max(bytes_on_disk) - min(bytes_on_disk)) / 7) AS avg_daily_growth
FROM disk_usage_history
WHERE recorded_at >= now() - INTERVAL 7 DAY
GROUP BY database, table
ORDER BY (max(bytes_on_disk) - min(bytes_on_disk)) DESC
LIMIT 20;
```

## Prometheus Metrics for Disk Monitoring

ClickHouse exposes disk metrics to Prometheus:

```text
ClickHouseAsyncMetrics_DiskAvailable_default  -- bytes free on default disk
ClickHouseAsyncMetrics_DiskTotal_default      -- total disk capacity
```

Grafana alert rule:

```text
(ClickHouseAsyncMetrics_DiskTotal_default - ClickHouseAsyncMetrics_DiskAvailable_default) / ClickHouseAsyncMetrics_DiskTotal_default > 0.80
```

## Project Time Until Disk Full

```sql
SELECT
    h.database,
    h.table,
    formatReadableSize(h.current_size) AS current_size,
    formatReadableSize(h.weekly_growth) AS weekly_growth,
    round(d.free_space / (h.weekly_growth / 7), 0) AS days_until_full
FROM (
    SELECT
        database, table,
        max(bytes_on_disk) AS current_size,
        max(bytes_on_disk) - min(bytes_on_disk) AS weekly_growth
    FROM disk_usage_history
    WHERE recorded_at >= today() - 7
    GROUP BY database, table
) AS h
CROSS JOIN (
    SELECT free_space FROM system.disks WHERE name = 'default'
) AS d
WHERE h.weekly_growth > 0
ORDER BY days_until_full ASC;
```

## Summary

Monitor ClickHouse disk usage with `system.parts` for current state, record daily snapshots in a history table to calculate growth rates, and project days until full for capacity planning. Set Prometheus alerts at 80% disk utilization to give yourself enough runway to add storage or archive old partitions.
