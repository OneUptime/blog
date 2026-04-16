# Validation Summary: How to Use ClickHouse Introspection Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse introspection functions (`addressToSymbol`, `addressToLine`, `demangle`, `tid`)
- `system.trace_log` (sampling profiler)
- `system.stack_trace` (live thread stacks)
- `system.query_log`, `system.asynchronous_metrics`
- `query_profiler_real_time_period_ns` / `query_profiler_cpu_time_period_ns` settings
- Brendan Gregg's `flamegraph.pl` tool
- jemalloc allocator introspection
- ClickHouse server XML configuration (config.d overrides)

## Sources Consulted
- [ClickHouse Introspection Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/introspection)
- [ClickHouse `system.trace_log` documentation](https://clickhouse.com/docs/en/operations/system-tables/trace_log)
- [ClickHouse `system.stack_trace` documentation](https://clickhouse.com/docs/en/operations/system-tables/stack_trace)
- [ClickHouse GRANT statement documentation](https://clickhouse.com/docs/sql-reference/statements/grant)
- [ClickHouse PR #2773 — switch to jemalloc](https://github.com/ClickHouse/ClickHouse/pull/2773)
- [Altinity KB — System tables retention / settings to adjust](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-system-tables-eat-my-disk/)

## Issues Found
1. **Non-existent `traceStack()` function.** The post had a section "traceStack Function" that called `SELECT traceStack()`. ClickHouse's documented introspection functions are `addressToLine`, `addressToLineWithInlines`, `addressToSymbol`, `demangle`, `isMergeTreePartCoveredBy`, `logTrace`, `mergeTreePartInfo`, and `tid`. There is no `traceStack()` function. Replaced the section with a working equivalent that queries `system.stack_trace` filtered by `tid()` to get the current thread's stack.
2. **Incorrect default allocator claim.** The post stated "ClickHouse uses tcmalloc (or jemalloc on some builds)". This is reversed — ClickHouse switched from tcmalloc to jemalloc in 2018 (PR #2773) and jemalloc has been the default since. Updated the section title and text to reflect jemalloc as the default allocator and dropped the `%tcmalloc%` filter from the example query.

## Review Notes
- `GRANT INTROSPECTION ON *.* TO user` is valid syntax. Worth noting for readers: the grantee also needs `SET allow_introspection_functions = 1` in their session before the functions are usable, since the setting defaults to 0.
- The `trace_log` XML config uses the single-`<engine>`-tag form, which is valid. The alternative form with separate `<partition_by>`, `<ttl>`, etc. tags exists but cannot be combined with `<engine>`.
- `addressToLine` and `addressToSymbol` require the ClickHouse server binary to have debug symbols available on disk; without them, calls return empty strings. Not a post error, but worth noting to readers who see empty results.
- The `event_date >= today()` filter in the folded-stack query aggregates across all queries run today — fine for overall hot-path inspection but will be dominated by the highest-volume queries. Readers profiling a specific slow query should keep the `query_id` filter.
