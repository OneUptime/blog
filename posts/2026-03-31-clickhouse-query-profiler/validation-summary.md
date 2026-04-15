# Validation Summary: How to Configure ClickHouse Query Profiler

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (sampling query profiler)
- system.trace_log system table
- ClickHouse introspection functions (demangle, addressToSymbol)
- ClickHouse array functions (arrayStringConcat, arrayMap, arrayReverse)
- Brendan Gregg's FlameGraph toolkit (flamegraph.pl)

## Sources Consulted
- ClickHouse Sampling Query Profiler documentation: https://clickhouse.com/docs/en/operations/optimizing-performance/sampling-query-profiler
- ClickHouse settings reference (query_profiler_real_time_period_ns, query_profiler_cpu_time_period_ns): https://clickhouse.com/docs/en/operations/settings/settings#query_profiler_real_time_period_ns
- ClickHouse system.trace_log documentation: https://clickhouse.com/docs/en/operations/system-tables/trace_log
- ClickHouse introspection functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/introspection
- ClickHouse INTO OUTFILE documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/into-outfile
- Brendan Gregg's FlameGraph GitHub repository: https://github.com/brendangregg/FlameGraph

## Issues Found
1. **Incorrect config file reference (line 17):** The post originally stated to configure profiler settings in `config.xml`. These are session-level settings, not server-level settings. They belong in `users.xml` inside a `<profiles>` block (e.g., under a `<default>` profile). The XML snippet was also missing the required `<profiles><default>` wrapper. Fixed by changing the reference to `users.xml` and adding the proper XML structure with the `<profiles>` and `<default>` elements.

## Review Notes
- The `INTO OUTFILE` syntax shown in the flamegraph export section only works with the ClickHouse command-line client and `clickhouse-local`. It does not work over the HTTP interface. This is a practical caveat that readers should be aware of, but it is not an error since the CLI client is the most common context for this workflow.
- The internal ClickHouse symbol names mentioned in the "Interpreting Results" section (e.g., `DB::MergeTreeBaseSelectProcessor`, `DB::Aggregator`, `DB::ExpressionActions`) are representative examples. Actual symbol names may vary across ClickHouse versions.
- All SQL syntax, function usage, and query patterns are correct and consistent with ClickHouse documentation.
