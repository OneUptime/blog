# Validation Summary: How to Fix 'No free disk space' Errors in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (system tables, MergeTree engine, storage policies, TTL)
- ClickHouse SQL (ALTER TABLE, TRUNCATE, DROP PARTITION, MODIFY TTL, MATERIALIZE TTL)
- ClickHouse storage configuration XML
- Linux CLI utilities (df, du, ls, find)

## Sources Consulted
- ClickHouse `system.parts` documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `system.metric_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/metric_log
- ClickHouse `system.asynchronous_metric_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metric_log
- ClickHouse `system.asynchronous_metrics` documentation: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse MergeTree storage configuration: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ALTER TTL documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse ALTER PARTITION documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition

## Issues Found
- **Monitoring query targeted the wrong system table.** The post originally queried `system.metric_log` for `metric = 'DiskAvailable_default'`. `system.metric_log` uses a wide schema (one column per `CurrentMetric_*` / `ProfileEvent_*` value) and does not contain a `metric`/`value` row layout. `DiskAvailable_<disk_name>` is an asynchronous metric and lives in `system.asynchronous_metric_log` (which uses the long `metric`, `value` schema referenced in the SELECT). Updated the FROM clause to `system.asynchronous_metric_log` so the query returns rows as written.

## Review Notes
- All `system.parts` queries (columns `database`, `table`, `bytes_on_disk`, `rows`, `active`, `partition`) are correct.
- `formatReadableSize`, `DROP PARTITION`, `TRUNCATE TABLE`, `MODIFY TTL`, `MATERIALIZE TTL`, and `MODIFY SETTING storage_policy = ...` are all valid ClickHouse syntax.
- The storage_configuration XML is correct: `keep_free_space_bytes` is a valid disk-level setting and `max_data_part_size_bytes` is a valid volume-level setting.
- Manually deleting files from `/var/lib/clickhouse/tmp/` while the server is running can be risky — the post correctly hedges with "stop clickhouse first if safe", which is good operational guidance.
- `system.metric_log` does have an opt-in newer "transposed" schema that mirrors the async layout, but it is not the default; using `system.asynchronous_metric_log` is the safe, broadly compatible choice for this metric.
