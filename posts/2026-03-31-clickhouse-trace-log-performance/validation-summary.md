# Validation Summary: How to Use system.trace_log for Performance Analysis in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system.trace_log table)
- ClickHouse Sampling Query Profiler
- ClickHouse introspection functions (demangle, addressToSymbol)
- ClickHouse array functions (arrayFirst, arrayMap, arrayStringConcat)

## Sources Consulted
- ClickHouse official documentation: system.trace_log table (https://clickhouse.com/docs/operations/system-tables/trace_log)
- ClickHouse official documentation: Sampling Query Profiler (https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler)
- ClickHouse official documentation: Introspection Functions (https://clickhouse.com/docs/sql-reference/functions/introspection)
- ClickHouse official documentation: Array Functions (https://clickhouse.com/docs/sql-reference/functions/array-functions)
- ClickHouse official documentation: SYSTEM Statements (https://clickhouse.com/docs/sql-reference/statements/system)

## Issues Found
- **Missing prerequisite for introspection functions**: The post used `demangle()` and `addressToSymbol()` in all query examples without mentioning that `allow_introspection_functions = 1` must be set first. These functions are disabled by default in ClickHouse for security reasons. Without this setting, every query that resolves addresses to function names would fail with an error. Added `SET allow_introspection_functions = 1;` to the "Enabling Trace Collection" section.

## Review Notes
- The `trace_type` list in the schema overview mentions `CPU`, `Real`, `Memory`, and `MemorySample`. While correct, ClickHouse also supports additional trace types such as `MemoryPeak`, `ProfileEvent`, `JemallocSample`, and others. The post's focus on the four most common types is reasonable for a tutorial.
- For symbol resolution to produce meaningful function names, the `clickhouse-common-static-dbg` package needs to be installed on the ClickHouse server. This is an environment setup detail the post does not cover but could be worth noting for readers who get empty symbol names.
- `TRUNCATE TABLE system.trace_log` works in practice for MergeTree-based log tables, but may be blocked if the table exceeds the `max_table_size_to_drop` threshold (default ~50 GB).
- All SQL syntax (lambda expressions, array functions, countIf, GROUP BY with aliases) is correct and idiomatic ClickHouse SQL.
- The profiler settings `query_profiler_real_time_period_ns` and `query_profiler_cpu_time_period_ns` with 10ms values are correct and match official documentation examples.
