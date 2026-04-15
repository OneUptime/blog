# Validation Summary: How to Profile ClickHouse Queries with Flamegraphs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (sampling query profiler, system.trace_log, introspection functions)
- Brendan Gregg's FlameGraph tools (flamegraph.pl)
- clickhouse-flamegraph community tool
- Bash/CLI tooling for data pipeline

## Sources Consulted
- ClickHouse Sampling Query Profiler docs: https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler
- ClickHouse system.trace_log docs: https://clickhouse.com/docs/operations/system-tables/trace_log
- ClickHouse introspection functions (demangle, addressToSymbol): https://clickhouse.com/docs/sql-reference/functions/introspection
- ClickHouse query_log type enum values: https://clickhouse.com/docs/operations/system-tables/query_log
- Brendan Gregg's FlameGraph repo: https://github.com/brendangregg/FlameGraph
- clickhouse-flamegraph tool: https://github.com/Slach/clickhouse-flamegraph
- ClickHouse Play UI documentation: https://clickhouse.com/docs/interfaces/http

## Issues Found

1. **Missing `allow_introspection_functions` setting**: The `demangle()` and `addressToSymbol()` functions used in the trace extraction queries require `SET allow_introspection_functions = 1`, which is disabled by default. Without this setting, the queries would fail with a permission error. Added the setting to the "Enabling Query Profiling" section.

2. **Incorrect awk pipeline for flamegraph generation**: The awk command `{for(i=1;i<NF;i++) printf $i";"; print $NF}` would incorrectly join the count column into the stack trace with a semicolon separator. Since the ClickHouse TabSeparated output is `stack\tcount` and `flamegraph.pl` expects `stack count` (space-separated), the correct approach is `tr '\t' ' '`. Replaced the awk command with `tr '\t' ' '`.

3. **Nonexistent ClickHouse setting `enable_opentelemetry_telemetry_injection`**: This setting does not exist in ClickHouse. It was used in the context of enabling flamegraphs in the Play UI, but this claim was also incorrect.

4. **Incorrect claim about Play UI showing flamegraphs natively**: The ClickHouse Play UI (`/play`) is a basic SQL editor and does not natively render flamegraphs. Replaced the entire section with accurate guidance on using the `clickhouse-flamegraph` community tool, which provides a streamlined workflow for generating flamegraphs from `system.trace_log`.

## Review Notes
- The post's SQL examples use `demangle(addressToSymbol(x))` which requires ClickHouse to be compiled with debug symbol information. In production deployments that strip symbols, these functions may return empty strings or raw hex addresses. This is a known limitation but not an error in the post.
- The `INTO OUTFILE` clause in ClickHouse writes to the client side when used with `clickhouse-client`, but writes to the server side when executed via the HTTP interface. Users running queries through the HTTP interface would need to redirect output instead.
- The flamegraph pattern analysis section uses approximate function names (e.g., "MergeSort", "LZ4Decompress", "Aggregator", "HashJoin") that are representative but may not match exact symbol names in every ClickHouse version.
