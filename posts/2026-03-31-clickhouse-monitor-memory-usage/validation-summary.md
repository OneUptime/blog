# Validation Summary: How to Monitor ClickHouse Memory Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables, server configuration, SQL settings profiles)
- Bash scripting (cron-based memory recording)
- Linux process memory metrics (RSS, virtual memory via /proc/self/status)

## Sources Consulted
- ClickHouse server configuration parameters documentation: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse system.metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse system.asynchronous_metrics documentation: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse memory overcommit settings: https://clickhouse.com/docs/en/operations/settings/memory-overcommit
- ClickHouse source code (src/Core/Defines.h) for default cache sizes

## Issues Found

1. **Incorrect metric name `MergesMutationsMemoryUsage`**: The metric does not exist in `system.metrics`. The correct name is `MergesMutationsMemoryTracking`. Fixed in the `system.metrics` query.

2. **Non-existent metric `DictionaryMemoryUsage`**: This metric does not exist in `system.metrics`. Dictionary memory usage is available through the `system.dictionaries` table (`bytes_allocated` column), not `system.metrics`. Removed from the query.

3. **Incorrect default for `uncompressed_cache_size`**: The XML config comment stated "default 8GB" but the actual default is 0 (disabled). The uncompressed cache must be explicitly enabled by setting a non-zero size. Fixed the comment to read "default 0, disabled".

## Review Notes
- All five asynchronous metrics (`MemoryResident`, `MemoryVirtual`, `MemoryShared`, `MemoryCode`, `MemoryDataAndStack`) are confirmed valid.
- The `max_server_memory_usage_to_ram_ratio` default is 0.9; the blog sets it to 0.8, which is a reasonable recommendation.
- The `memory_overcommit_ratio_denominator` and `memory_usage_overcommit_max_wait_microseconds` settings are valid but were introduced in ClickHouse 22.x; older versions will not support them.
- The `QueryCacheBytes` and `QueryCacheEntries` metrics require ClickHouse 23.1+ (when the Query Cache feature was added).
- The `formatReadableSize(avg(peak_memory_usage))` call in the "Average peak memory by user" query relies on implicit Float64-to-UInt64 conversion; adding an explicit `toUInt64()` cast would be more robust but is not strictly required.
