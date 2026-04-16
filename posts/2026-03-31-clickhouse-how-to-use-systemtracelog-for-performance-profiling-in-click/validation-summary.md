# Validation Summary: How to Use system.trace_log for Performance Profiling in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse query profiler
- `system.trace_log` system table
- `system.query_log` system table
- ClickHouse introspection functions (`demangle`, `addressToSymbol`)
- XML configuration for ClickHouse (`users.xml`, `config.xml`)
- flamegraph.pl (Brendan Gregg's FlameGraph tooling)

## Sources Consulted
- ClickHouse `system.trace_log` docs: https://clickhouse.com/docs/en/operations/system-tables/trace_log
- ClickHouse query profiler settings: https://clickhouse.com/docs/en/operations/settings/settings (sections `query_profiler_real_time_period_ns`, `query_profiler_cpu_time_period_ns`)
- ClickHouse server configuration (trace_log section): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse introspection functions: https://clickhouse.com/docs/en/sql-reference/functions/introspection
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
1. **Incomplete `trace_type` enum list** — The post listed `Real`, `CPU`, `Memory`, `MemorySample`, `MemoryPeak` as the valid values. `ProfileEvent` is also a valid (and commonly encountered) `trace_type` value that records profile event increments. Added `ProfileEvent` to the list so readers are not surprised when they see it in their own trace_log output.

## Review Notes
- All SQL queries use valid ClickHouse syntax and real columns/functions. The `demangle(addressToSymbol(addr))` pattern is the standard ClickHouse approach for symbolicating stack traces.
- Usage of `demangle`/`addressToSymbol` requires `SET allow_introspection_functions = 1` and the `clickhouse-common-static-dbg` debug-symbols package to be installed on the server. The post does not mention this prerequisite — readers may see `<unknown>` symbols without it. This is a useful future improvement but not a technical inaccuracy.
- The `<trace_log>` XML snippet with a top-level `<ttl>` tag is valid because no custom `<engine>` is defined; if a user adds an `<engine>` block, TTL would need to move inside it. The current snippet is technically correct as written.
- The recommended sampling period values (`100000000` ns = 10 samples/sec, `1000000000` ns = 1 sample/sec) match the ClickHouse documentation's guidance.
- Other valid `trace_type` values not mentioned (`JemallocSample`, `MemoryAllocatedWithoutCheck`, `Instrumentation`) are more advanced/developer-focused and reasonably omitted from an introductory post.
- The flamegraph.pl workflow is correct and matches standard Brendan Gregg FlameGraph tool usage.
