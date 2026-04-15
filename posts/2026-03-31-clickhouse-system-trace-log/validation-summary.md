# Validation Summary: How to Use system.trace_log in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system.trace_log table)
- ClickHouse sampling query profiler
- ClickHouse introspection functions (addressToSymbol, demangle)
- Brendan Gregg's FlameGraph toolkit (flamegraph.pl)

## Sources Consulted
- ClickHouse system.trace_log documentation: https://clickhouse.com/docs/operations/system-tables/trace_log
- ClickHouse introspection functions documentation: https://clickhouse.com/docs/sql-reference/functions/introspection
- ClickHouse sampling query profiler documentation: https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler
- ClickHouse system tables configuration: https://clickhouse.com/docs/operations/system-tables/overview
- Brendan Gregg's FlameGraph repository: https://github.com/brendangregg/FlameGraph

## Issues Found

1. **Flame graph query column order (lines 91-103)**: The SQL query for generating flamegraph.pl input had `count() AS samples` as the first column and `stack` as the second. The `flamegraph.pl` tool expects the collapsed stack format `stack_trace\tcount`, with the stack first and count second. Swapped the column order so `stack` is selected first and `samples` second.

2. **trace_type column type (line 52)**: The `trace_type` column was listed as type `Enum` but the actual ClickHouse type is `Enum8`. Corrected to `Enum8`.

## Review Notes
- The post does not mention that `allow_introspection_functions = 1` must be set (and the `clickhouse-common-static-dbg` package installed) for `addressToSymbol()` and `demangle()` to work. Without this, the introspection queries will fail. This is not an error in the code itself but a missing prerequisite that readers may encounter.
- The trace_type enum values listed (Real, CPU, Memory, MemorySample) are a subset of the actual values. Additional values include MemoryPeak, ProfileEvent, JemallocSample, MemoryAllocatedWithoutCheck, and Instrumentation. The post uses "etc." which covers this, but readers working with memory profiling may want to know about MemoryPeak specifically.
- All SQL syntax, function names, settings, and configuration snippets are otherwise correct and current.
