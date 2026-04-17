# Validation Summary: How to Debug Memory-Related Issues in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse
- ClickHouse system tables (system.query_log, system.processes, system.metrics, system.trace_log, system.caches)
- ClickHouse SQL settings (max_memory_usage, max_memory_usage_for_user, max_server_memory_usage_to_ram_ratio, max_bytes_before_external_group_by, max_bytes_before_external_sort, memory_profiler_sample_probability)
- ClickHouse SYSTEM commands (DROP UNCOMPRESSED CACHE, DROP MARK CACHE)

## Sources Consulted
- [ClickHouse Query Complexity Settings](https://clickhouse.com/docs/operations/settings/query-complexity)
- [ClickHouse system.metrics documentation](https://clickhouse.com/docs/en/operations/system-tables/metrics)
- [Altinity KB: Who ate my ClickHouse memory?](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-who-ate-my-memory/)
- ClickHouse GitHub docs for system-tables/metrics.md

## Issues Found

1. **Incorrect description of `max_memory_usage_for_user`**: The original comment described this setting as "Ratio of server RAM a single query can use." This is wrong on two counts: (a) the setting takes a byte value, not a ratio, and (b) it limits the total memory used by all concurrent queries from a user, not a single query. Fixed the comment to: "Total memory limit in bytes for all concurrent queries from a user (0 = unlimited)."

2. **Misleading default for `max_memory_usage`**: The original comment said "default 0 = unlimited, uses server fraction." The default is actually 10 GB (10000000000 bytes) in stock configs; 0 means unlimited. Clarified the comment to: "Per-query limit in bytes (0 = unlimited; default is 10 GB)."

3. **Outdated metric names**: The post listed `MemoryTrackingForMerges` and `MemoryTrackingInBackgroundSchedulePool` as key metrics in `system.metrics`. In current ClickHouse versions, the correct metric is `MergesMutationsMemoryTracking` (which covers background merges and mutations), and `MemoryTrackingInBackgroundSchedulePool` is not a current metric. Replaced with currently valid metric names: `MemoryTracking`, `MergesMutationsMemoryTracking`, and `MemoryTrackingUncorrected`.

## Review Notes

- The `system.query_log`, `system.processes`, `system.trace_log`, and `system.caches` table references are correct.
- The memory profiler snippet (`memory_profiler_sample_probability`, `trace_type = 'MemorySample'`, `demangle(addressToSymbol(...))`) is valid and matches current ClickHouse tooling.
- The `max_bytes_before_external_group_by` and `max_bytes_before_external_sort` settings are correct.
- The claim that `GROUP BY` uses less memory than `DISTINCT` is a common optimization guideline, though in recent ClickHouse versions the two operations share much of the same hash-table implementation and differences can be small. Left as written since it still holds in common cases.
- `SYSTEM DROP UNCOMPRESSED CACHE` and `SYSTEM DROP MARK CACHE` are valid commands.
