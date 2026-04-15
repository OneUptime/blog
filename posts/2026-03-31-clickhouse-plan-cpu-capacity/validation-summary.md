# Validation Summary: How to Plan ClickHouse CPU Capacity

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (query engine, system tables, profiling, configuration)
- clickhouse-benchmark (CLI benchmarking utility)
- ClickHouse system.query_log and system.trace_log tables
- ClickHouse MergeTree engine settings

## Sources Consulted
- [system.query_log | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/query_log) — verified column names, ProfileEvents access pattern, and QueryFinish enum value
- [How to Identify Expensive Queries | ClickHouse Docs](https://clickhouse.com/docs/knowledgebase/find-expensive-queries) — confirmed UserTimeMicroseconds/SystemTimeMicroseconds ProfileEvent names
- [clickhouse-benchmark | ClickHouse Docs](https://clickhouse.com/docs/operations/utilities/clickhouse-benchmark) — verified --concurrency, --iterations, --query flags
- [Server Settings | ClickHouse Docs](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — verified background_pool_size is obsolete, background_move_pool_size is valid
- [MergeTree Settings | ClickHouse Docs](https://clickhouse.com/docs/operations/settings/merge-tree-settings) — verified background_merges_mutations_concurrency_ratio as the current replacement
- [Sampling Query Profiler | ClickHouse Docs](https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler) — verified query_profiler_cpu_time_period_ns setting
- [system.trace_log | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/trace_log) — verified table and query_id column exist

## Issues Found
1. **`background_pool_size` is obsolete**: The original post used `<background_pool_size>8</background_pool_size>` with a comment "merge threads." In modern ClickHouse, this setting is marked "Obsolete setting, does nothing." Replaced it with `<merge_tree><background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio></merge_tree>`, which is the current MergeTree-level setting that controls merge and mutation concurrency. Also added a clarifying comment that `max_threads` is a profile-level setting.

## Review Notes
- The `ProfileEvents.Values[indexOf(ProfileEvents.Names, '...')]` syntax is correct but somewhat verbose. The more modern and concise alternative is `ProfileEvents['UserTimeMicroseconds']` using map key access. Both work; the post uses the older but still valid pattern.
- The CPU scaling model (`T = data_scanned / (cores * scan_rate_per_core)`) and the "200-500 MB/s per core" scan rate are reasonable ballpark figures consistent with ClickHouse community benchmarks, though actual rates vary significantly by hardware, data types, and compression codec.
- The ingestion CPU estimate of "2-4 cores per 100,000 rows/sec" is a rough guideline. Actual CPU consumption varies widely based on row width, compression settings, and the number of columns/indexes being maintained.
