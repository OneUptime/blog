# Validation Summary: How to Profile Query Performance in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables, profiling, benchmarking)
- system.query_log
- system.query_thread_log
- system.trace_log (sampling profiler)
- EXPLAIN PIPELINE
- clickhouse-benchmark utility
- ClickHouse HTTP interface progress headers

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.query_thread_log documentation: https://clickhouse.com/docs/operations/system-tables/query_thread_log
- ClickHouse system.trace_log documentation: https://clickhouse.com/docs/operations/system-tables/trace_log
- ClickHouse sampling query profiler documentation: https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse introspection functions documentation: https://clickhouse.com/docs/sql-reference/functions/introspection
- ClickHouse clickhouse-benchmark documentation: https://clickhouse.com/docs/operations/utilities/clickhouse-benchmark
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/interfaces/http
- ClickHouse ProfileEvents source code: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp

## Issues Found
1. **clickhouse-benchmark command was redundant/incorrect**: The original command piped a query via `echo` into `clickhouse-benchmark` while also using `--query "$(cat)"` to read from stdin. This is a redundant and convoluted pattern — `clickhouse-benchmark` accepts queries either via stdin piping or via the `--query` flag, but combining both is unnecessary and confusing. Fixed to use the `--query` flag directly with the query string.

## Review Notes
- The introspection functions (`demangle()`, `addressToSymbol()`) used in the trace_log query require installing the `clickhouse-common-static-dbg` package and setting `allow_introspection_functions = 1`. The post does not mention this prerequisite, which could cause confusion for readers. This is not a technical error but could be a helpful addition in a future revision.
- The sampling profiler period of 1,000,000 ns (1ms) is more aggressive than what the ClickHouse docs recommend as a minimum (10,000,000 ns / 10ms for single queries). While valid, very fast sampling may cause measurable overhead on production systems. Worth noting in a future update.
- The `query_thread_log` XML configuration is correct, but the post does not mention that `log_query_threads = 1` must also be set at the session or user level for thread-level logging to take effect.
- All SQL column names, ProfileEvents keys, system table structures, EXPLAIN types, and function names were verified as correct.
