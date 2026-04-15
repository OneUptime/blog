# Validation Summary: How to Monitor ClickHouse Disk Usage and Growth Rate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL queries, system tables)
- ClickHouse system.parts table
- ClickHouse system.disks table
- ClickHouse Prometheus metrics (built-in endpoint)
- Grafana alerting

## Sources Consulted
- ClickHouse documentation on system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation on system.disks: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse documentation on system.asynchronous_metrics: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse Prometheus integration documentation: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#prometheus
- ClickHouse SQL syntax reference for formatReadableSize, WITH clauses, and date arithmetic

## Issues Found

1. **Incorrect Prometheus metric names**: The post used `ClickHouseDiskAvailable_default` and `ClickHouseDiskTotal_default`. ClickHouse's built-in Prometheus endpoint exposes asynchronous metrics with the `ClickHouseAsyncMetrics_` prefix. Fixed to `ClickHouseAsyncMetrics_DiskAvailable_default` and `ClickHouseAsyncMetrics_DiskTotal_default`.

2. **Grafana alert rule used wrong metric names**: The alert referenced `ClickHouseDiskTotal` and `ClickHouseDiskAvailable` (also missing the `_default` disk suffix), which were inconsistent with the listed metrics and incorrect. Fixed to use the full correct metric names `ClickHouseAsyncMetrics_DiskTotal_default` and `ClickHouseAsyncMetrics_DiskAvailable_default`.

3. **"Days until full" formula was logically incorrect**: The original formula `current_size / (weekly_growth / 7)` divided the current table size by the daily growth rate. This calculates how long it took to accumulate the current data, not how many days until the disk fills up. Fixed by joining with `system.disks` to obtain `free_space` and computing `free_space / daily_growth` instead, which correctly projects when the disk will run out of space.

4. **Unused CTE variable**: The `now() AS t_now` declaration in the WITH clause was never referenced in the query. Removed the WITH clause entirely and inlined `today() - 7` directly in the WHERE clause for clarity.

## Review Notes
- The `min_date` and `max_date` columns in `system.parts` (used in the "Disk Usage by Partition" query) only contain meaningful values for MergeTree tables partitioned by a Date-type column. For tables with other partition expressions (e.g., `toYYYYMM()`), these columns may return `1970-01-01`. This is a minor caveat, not an error.
- The "days until full" query now assumes the `default` disk. Users with multiple disks or custom storage policies would need to adjust the `WHERE name = 'default'` filter in the `system.disks` subquery.
- The growth rate calculation uses `max(bytes_on_disk) - min(bytes_on_disk)` which can underestimate growth if data was deleted mid-window. This is an acceptable simplification for a monitoring guide.
