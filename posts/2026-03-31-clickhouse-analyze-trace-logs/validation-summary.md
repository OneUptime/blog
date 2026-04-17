# Validation Summary: How to Analyze ClickHouse Trace Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system.trace_log, system.query_log)
- ClickHouse sampling query profiler (CPU and memory tracing)
- ClickHouse introspection functions: `addressToSymbol`, `demangle`, `arrayMap`, `arrayStringConcat`, `arrayReverse`
- `clusterAllReplicas` table function
- Brendan Gregg's FlameGraph (`flamegraph.pl`)

## Sources Consulted
- [ClickHouse system.trace_log docs](https://clickhouse.com/docs/en/operations/system-tables/trace_log)
- [ClickHouse Sampling Query Profiler](https://clickhouse.com/docs/en/operations/optimizing-performance/sampling-query-profiler)
- [ClickHouse server configuration parameters (trace_log)](https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings)
- [ClickHouse knowledgebase: How to collect and draw a query trace](https://clickhouse.com/docs/knowledgebase/collect-and-draw-traces)

## Issues Found
- **Invalid `<collect_interval_milliseconds>` in `<trace_log>` config**: The original config snippet included a `<collect_interval_milliseconds>1000</collect_interval_milliseconds>` element. This parameter is not valid under `<trace_log>`; it belongs to `<metric_log>`. For `trace_log`, the sampling cadence is controlled by the session-level settings `query_profiler_cpu_time_period_ns` and `query_profiler_real_time_period_ns` (which the post correctly shows immediately after). I removed the invalid line and added the standard `<partition_by>toYYYYMM(event_date)</partition_by>` element that ships with the default trace_log configuration.

## Review Notes
- The listed `trace_type` values (CPU, Real, Memory, MemorySample, MemoryPeak) are all valid. ClickHouse also supports additional types (`ProfileEvent`, `JemallocSample`, `MemoryAllocatedWithoutCheck`, `Instrumentation`) but enumerating them is not required for this tutorial.
- The flamegraph export uses `FORMAT TabSeparated`. `flamegraph.pl` accepts whitespace-separated `stack count` lines (its regex allows tabs), so this works as written.
- The example query for decoding stack traces could optionally include `addressToLine(x)` alongside `addressToSymbol(x)` to surface source locations, but this is a stylistic improvement, not a correctness issue.
- All SQL functions and table-function syntax (`clusterAllReplicas('cluster', system, trace_log)`, `INTO OUTFILE`, `arrayReverse`) match current ClickHouse documentation.
