# Validation Summary: How to Use system.asynchronous_metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL queries, server configuration)
- system.asynchronous_metrics table
- system.metrics and system.events (comparisons)
- Prometheus endpoint integration
- Grafana alerting
- jemalloc memory allocator metrics

## Sources Consulted
- ClickHouse official docs: system.asynchronous_metrics — https://clickhouse.com/docs/operations/system-tables/asynchronous_metrics
- ClickHouse official docs: system.metrics — https://clickhouse.com/docs/operations/system-tables/metrics
- ClickHouse official docs: system.events — https://clickhouse.com/docs/operations/system-tables/events
- ClickHouse official docs: MergeTree settings (parts_to_delay_insert, parts_to_throw_insert) — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse official docs: Prometheus protocols — https://clickhouse.com/docs/interfaces/prometheus
- ClickHouse official docs: formatReadableSize function — https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse official docs: toUInt64 function — https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse source code: src/Core/ServerSettings.cpp (asynchronous_metrics_update_period_s default)
- ClickHouse source code: src/Storages/MergeTree/MergeTreeSettings.cpp (parts_to_delay_insert, parts_to_throw_insert defaults)

## Issues Found
- **MaxPartCountForPartition throttling threshold was incorrect.** The post claimed "When this exceeds 300, ClickHouse starts throttling inserts." This is wrong. The value 300 is a diagnostic warning indicator (the docs say "Values larger than 300 indicates misconfiguration, overload, or massive data loading"), not a throttling trigger. Actual insert throttling begins at `parts_to_delay_insert` (default: 1000), and inserts are rejected entirely above `parts_to_throw_insert` (default: 3000). The old default of 300 for `parts_to_throw_insert` was from versions prior to 23.6, and even then it was a rejection threshold, not a throttling threshold. Fixed the paragraph to accurately describe the warning indicator and the correct throttling/rejection defaults.

## Review Notes
- The `toUInt64()` wrapper in `formatReadableSize(toUInt64(value))` is technically unnecessary since `formatReadableSize` accepts Float64 directly, but it is not harmful and truncates decimal values for cleaner output. Left as-is since it works correctly.
- The Prometheus endpoint `/metrics` is accurate for self-managed ClickHouse but requires explicit configuration (not enabled by default). The post does not mention this prerequisite, which could confuse new users, but this is a minor omission rather than an error.
- `UncompressedCacheBytes` and `MarkCacheBytes` are real metrics that exist in the table but are not enumerated on the official docs page. They are widely referenced in GitHub issues and third-party ClickHouse guides. Left as-is since they are valid metrics.
