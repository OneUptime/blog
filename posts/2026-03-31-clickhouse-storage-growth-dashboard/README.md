# How to Build a ClickHouse Storage Growth Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Dashboard, Monitoring, Capacity Planning

Description: Build a ClickHouse storage growth dashboard to track disk usage trends, compression ratios, and table-level growth rates to support capacity planning.

---

Storage growth dashboards help you anticipate disk exhaustion before it becomes an outage. ClickHouse's `system.parts`, `system.disks`, and `system.part_log` tables provide everything you need to track current usage, growth trends, and compression efficiency.

## Current Disk Usage by Table

```sql
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS compressed_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size,
    round(sum(data_uncompressed_bytes) / sum(bytes_on_disk), 2) AS compression_ratio,
    count() AS part_count,
    sum(rows) AS total_rows
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 20;
```

## Disk Free Space Panel

```sql
SELECT
    name AS disk,
    type,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total,
    round((1 - free_space / total_space) * 100, 1) AS used_pct
FROM system.disks
ORDER BY used_pct DESC;
```

Alert when `used_pct` exceeds 80% to give yourself time to act.

## Storage Growth Over Time

Use the `system.part_log` to track historical growth:

```sql
SELECT
    toStartOfDay(event_time) AS day,
    database,
    table,
    sum(size_in_bytes) AS bytes_added
FROM system.part_log
WHERE event_type = 'NewPart'
    AND event_time >= now() - INTERVAL 30 DAY
GROUP BY day, database, table
ORDER BY day, bytes_added DESC;
```

## Daily Compressed Data Written

```sql
SELECT
    toStartOfDay(event_time) AS day,
    formatReadableSize(sum(size_in_bytes)) AS data_written
FROM system.part_log
WHERE event_type = 'NewPart'
    AND event_time >= now() - INTERVAL 90 DAY
GROUP BY day
ORDER BY day;
```

Plot this as a bar chart to identify growth trends and seasonal patterns.

## Growth Rate Projection

Estimate how many days until disk is full:

```sql
WITH
    daily_growth AS (
        SELECT avg(bytes_added) AS avg_daily_bytes
        FROM (
            SELECT
                toStartOfDay(event_time) AS day,
                sum(size_in_bytes) AS bytes_added
            FROM system.part_log
            WHERE event_type = 'NewPart'
                AND event_time >= now() - INTERVAL 7 DAY
            GROUP BY day
        )
    )
SELECT
    d.name AS disk,
    formatReadableSize(d.free_space) AS free_space,
    round(d.free_space / g.avg_daily_bytes) AS days_until_full
FROM system.disks d, daily_growth g
ORDER BY days_until_full ASC;
```

## TTL Effectiveness Panel

If you use TTL to expire old data, track how much is being dropped:

```sql
SELECT
    toStartOfDay(event_time) AS day,
    database,
    table,
    formatReadableSize(sum(size_in_bytes)) AS bytes_expired
FROM system.part_log
WHERE event_type = 'RemovePart'
    AND event_time >= now() - INTERVAL 30 DAY
GROUP BY day, database, table
ORDER BY day, sum(size_in_bytes) DESC;
```

## Compression Ratio Trend

```sql
SELECT
    toStartOfWeek(event_time) AS week,
    database,
    table,
    round(avg(rows) / (avg(size_in_bytes) / 1000), 0) AS rows_per_kb
FROM system.part_log
WHERE event_type = 'NewPart'
    AND event_time >= now() - INTERVAL 90 DAY
GROUP BY week, database, table
ORDER BY week;
```

## Summary

A storage growth dashboard turns raw disk metrics into actionable capacity intelligence. Track current usage per table, model daily growth rates, and project days-until-full so you can schedule expansions proactively. Combine with TTL monitoring to ensure your data lifecycle policies are working as intended and freeing space as expected.
