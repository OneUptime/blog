# Validation Summary: How to Monitor ClickHouse Disk Usage

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (system tables: `system.disks`, `system.parts`, `system.storage_policies`, `system.tables`)
- MergeTree engine (TTL, partitions, OPTIMIZE TABLE)
- Bash scripting (cron-based monitoring and alerting)
- Prometheus / PromQL (ClickHouse async metrics for disk monitoring)
- Slack webhooks (alerting integration)

## Sources Consulted
- ClickHouse official documentation — `system.tables`: https://clickhouse.com/docs/operations/system-tables/tables
- ClickHouse official documentation — `system.asynchronous_metrics`: https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics
- ClickHouse official documentation — `system.disks`: https://clickhouse.com/docs/operations/system-tables/disks
- ClickHouse official documentation — `system.parts`: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse official documentation — `system.storage_policies`: https://clickhouse.com/docs/operations/system-tables/storage_policies
- ClickHouse official documentation — TTL expressions: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- Altinity KB — TTL queries: https://kb.altinity.com/altinity-kb-queries-and-syntax/ttl/what-are-my-ttls/
- Altinity Operator Issue #1487 — Disk metric naming change in v24.3+: https://github.com/Altinity/clickhouse-operator/issues/1487

## Issues Found

### 1. Non-existent `ttl_expression` column in `system.tables`
- **What was wrong:** The query to check TTL configuration on existing tables used `ttl_expression` as a column name in `system.tables`. This column does not exist; the query would fail with an "Unknown column" error.
- **What was changed:** Replaced `ttl_expression` with `create_table_query` and changed the WHERE clause from `ttl_expression != ''` to `create_table_query LIKE '%TTL%'`. This correctly filters tables that have TTL configured by inspecting the CREATE TABLE statement.
- **Why:** `system.tables` does not expose TTL as a dedicated column. The TTL clause is part of the table's DDL, which is stored in the `create_table_query` column.

### 2. Incorrect Prometheus async metric names for disk free space
- **What was wrong:** The post referenced `ClickHouseAsyncMetrics_DiskFree_default` and `ClickHouseAsyncMetrics_DiskFree_cold` as Prometheus metric names. The correct metric name is `DiskAvailable_*`, not `DiskFree_*`. There is no `DiskFree` metric in ClickHouse's `system.asynchronous_metrics`.
- **What was changed:** Replaced all instances of `DiskFree` with `DiskAvailable` in the Prometheus metrics section, including the metric list and the PromQL alert expression. Updated the comment from "Free space" to "Available space".
- **Why:** ClickHouse's asynchronous metrics use `DiskAvailable_<disk_name>` for available disk space. The `DiskFree` naming does not exist and would result in missing data in Prometheus dashboards and non-firing alerts.

## Review Notes
- The `min_date` and `max_date` columns used in the partition-level query are only meaningful for tables using Date-type partition keys or the old-style monthly partitioning. For tables with custom partition expressions (e.g., `PARTITION BY toYYYYMMDD(timestamp)`), these columns may not reflect the actual date range of the data. This is a minor limitation but does not constitute an error.
- The `OPTIMIZE TABLE events FINAL` command for forcing TTL evaluation is correct but can be very resource-intensive on large tables. In production, `OPTIMIZE TABLE events` (without FINAL) or setting `materialize_ttl_after_modify` may be preferable. The post's approach is not wrong, but users should be aware of the performance implications.
- The shell-based alerting script does not escape the `$result` variable in the JSON payload, which could break if disk names contain special characters. This is unlikely in practice but worth noting for production use.
