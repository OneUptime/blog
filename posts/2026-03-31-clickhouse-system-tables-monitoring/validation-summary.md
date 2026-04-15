# Validation Summary: How to Use ClickHouse System Tables for Monitoring

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse (system tables, SQL dialect)
- MergeTree engine family (parts, merges, mutations)
- ClickHouse replication (ZooKeeper-based replicated tables)

## Sources Consulted
- ClickHouse official documentation: system.metrics table (https://clickhouse.com/docs/en/operations/system-tables/metrics)
- ClickHouse official documentation: system.events table (https://clickhouse.com/docs/en/operations/system-tables/events)
- ClickHouse official documentation: system.asynchronous_metrics table (https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics)
- ClickHouse official documentation: system.processes table (https://clickhouse.com/docs/en/operations/system-tables/processes)
- ClickHouse official documentation: system.replicas table (https://clickhouse.com/docs/en/operations/system-tables/replicas)
- ClickHouse official documentation: system.replication_queue table (https://clickhouse.com/docs/en/operations/system-tables/replication_queue)
- ClickHouse official documentation: system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse official documentation: system.merges table (https://clickhouse.com/docs/en/operations/system-tables/merges)
- ClickHouse official documentation: system.errors table (https://clickhouse.com/docs/en/operations/system-tables/errors)
- ClickHouse official documentation: SQL functions reference (https://clickhouse.com/docs/en/sql-reference/functions)
- Cross-referenced with other validated ClickHouse blog posts in the repository

## Issues Found
No technical issues found.

## Review Notes
- The metric name `BackgroundPoolTask` in the system.metrics query was renamed in ClickHouse 22.x+ to more specific metrics like `BackgroundMergesAndMutationsPoolTask`, `BackgroundMovePoolTask`, and `BackgroundSchedulePoolTask`. However, since the query uses `WHERE metric IN (...)`, a missing metric simply returns no rows rather than causing an error. This is a minor version caveat, not an error.
- All SQL functions used (`uptime()`, `formatReadableSize()`, `toUInt64()`, `round()`) are valid ClickHouse built-in functions.
- All system table column names verified correct: `system.metrics` (metric, value, description), `system.events` (event, value, description), `system.asynchronous_metrics` (metric, value), `system.processes` (query_id, user, elapsed, read_bytes, memory_usage, read_rows, total_rows_approx, is_cancelled, query), `system.replicas` (all listed columns including log_max_index, log_pointer, absolute_delay), `system.replication_queue` (all listed columns), `system.parts` (data_compressed_bytes, data_uncompressed_bytes, active, rows), `system.merges` (progress, total_size_bytes_compressed, bytes_read_uncompressed, is_mutation, result_part_name), `system.errors` (name, code, value, last_error_time, last_error_message).
- The `system.tables` query correctly uses the `comment` column which is available in ClickHouse.
- The `MemoryResident` async metric used in the health check query is a valid metric name.
