# Validation Summary: How to Fix 'Cannot allocate memory' Errors in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (server configuration, system tables, settings)
- SQL (ClickHouse dialect)
- XML configuration files (`/etc/clickhouse-server/config.d/`)
- Linux shell utilities (`dmesg`, `journalctl`, `fallocate`, `mkswap`, `swapon`)

## Sources Consulted
- [ClickHouse Docs — system.metrics](https://clickhouse.com/docs/operations/system-tables/metrics)
- [ClickHouse Docs — system.merges](https://clickhouse.com/docs/operations/system-tables/merges)
- [ClickHouse Docs — system.query_log](https://clickhouse.com/docs/operations/system-tables/query_log)
- [ClickHouse Docs — system.processes](https://clickhouse.com/docs/operations/system-tables/processes)
- [ClickHouse Docs — MergeTree Settings](https://clickhouse.com/docs/operations/settings/merge-tree-settings)
- [ClickHouse Docs — Memory settings (`max_memory_usage`, `max_server_memory_usage_to_ram_ratio`, `max_bytes_before_external_group_by`, `max_bytes_before_external_sort`, `group_by_two_level_threshold(_bytes)`, `uncompressed_cache_size`)](https://clickhouse.com/docs/operations/settings/settings)
- [ClickHouse source — CurrentMetrics.cpp](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/CurrentMetrics.cpp)

## Issues Found
- **Outdated metric name** (`system.metrics` query): The post referenced `MemoryTrackingForMerges`, which has been renamed. The current metric in ClickHouse is `MergesMutationsMemoryTracking` (tracks total memory allocated by background merges and mutations). Updated the `IN (...)` list in the "Check Current Memory Usage" section accordingly.

## Review Notes
- All other ClickHouse settings referenced are accurate and current: `max_memory_usage`, `max_server_memory_usage_to_ram_ratio`, `max_bytes_before_external_group_by`, `max_bytes_before_external_sort`, `group_by_two_level_threshold`, `group_by_two_level_threshold_bytes`, `max_threads`, `uncompressed_cache_size`.
- `system.merges` does expose a `memory_usage` column, so the `ORDER BY memory_usage DESC` example works as written.
- `system.query_log.type = 'ExceptionWhileProcessing'` is a valid value; note it won't include `ExceptionBeforeStart` (pre-execution memory rejections). For completeness, users may eventually want to include both types, but the current filter is technically correct.
- `max_bytes_to_merge_at_max_space_in_pool` controls the maximum total size of source parts eligible for a single merge (default 150 GB). Lowering it does indirectly reduce peak merge memory, so the framing in the post is acceptable, though it is primarily a size limit rather than a direct memory cap.
- Swap is shown as a "safety net" — reasonable pragmatically, but note ClickHouse officially recommends disabling swap for performance. This is a tradeoff and not a technical error.
- The XML configuration syntax uses the modern `<clickhouse>` root element, which is correct for current versions (the legacy `<yandex>` root is deprecated).
