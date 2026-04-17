# Validation Summary: How to Diagnose ClickHouse CPU Spikes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse system tables (`system.processes`, `system.query_log`, `system.merges`, `system.trace_log`)
- ClickHouse Query Profiler / sampling profiler
- ClickHouse introspection functions (`addressToSymbol`, `demangle`)
- ClickHouse string search functions (`match`, `hasToken`)
- `KILL QUERY` statement
- Materialized views / pre-aggregation
- ZSTD codec

## Sources Consulted
- ClickHouse system tables documentation: https://clickhouse.com/docs/en/operations/system-tables
- `system.processes`: https://clickhouse.com/docs/en/operations/system-tables/processes
- `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- `system.merges`: https://clickhouse.com/docs/en/operations/system-tables/merges
- `system.trace_log`: https://clickhouse.com/docs/en/operations/system-tables/trace_log
- Query Profiler: https://clickhouse.com/docs/en/operations/optimizing-performance/sampling-query-profiler
- Introspection functions: https://clickhouse.com/docs/en/sql-reference/functions/introspection
- `KILL QUERY` statement: https://clickhouse.com/docs/en/sql-reference/statements/kill
- String search functions (`match`, `hasToken`): https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions

## Issues Found
No technical issues found. All SQL snippets, system table columns, ProfileEvents keys (`OSCPUVirtualTimeMicroseconds`), settings (`query_profiler_cpu_time_period_ns`), trace_log `trace_type = 'CPU'` value, and function references (`addressToSymbol`, `demangle`, `match`, `hasToken`) are valid against current ClickHouse documentation. The `KILL QUERY WHERE ...` syntax with `elapsed` and `user` predicates is correct, as those are columns on `system.processes`.

## Review Notes
- The introspection functions `addressToSymbol()` and `demangle()` require the session setting `allow_introspection_functions = 1` and the `clickhouse-common-static-dbg` debug symbols package to produce readable symbol names. The post doesn't mention these prerequisites; the queries are technically correct but may return empty/raw results if the requirements aren't met. Consider noting this in a future revision.
- The default value of `query_profiler_cpu_time_period_ns` is 1,000,000,000 ns (1 sample per second). The post's suggested value of 10,000,000 ns (100 samples/sec) is a reasonable higher-resolution override for targeted profiling.
- The claim "each background thread uses a full CPU core" during ZSTD recompression merges is a reasonable characterization — merge threads are typically CPU-bound when recompressing, though actual utilization depends on I/O and codec level.
