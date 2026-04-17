# Validation Summary: How to Enable Query Tracing in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (sampling query profiler, system tables)
- ClickHouse `system.trace_log` and `system.query_log`
- ClickHouse introspection functions (`addressToSymbol`, `demangle`)
- OpenTelemetry tracing (via `system.opentelemetry_span_log`)
- Brendan Gregg's flamegraph.pl
- `clickhouse-client` CLI

## Sources Consulted
- [ClickHouse: Sampling Query Profiler](https://clickhouse.com/docs/operations/optimizing-performance/sampling-query-profiler)
- [ClickHouse: system.trace_log](https://clickhouse.com/docs/operations/system-tables/trace_log)
- [ClickHouse: Introspection Functions](https://clickhouse.com/docs/en/sql-reference/functions/introspection)
- [ClickHouse: OpenTelemetry Support](https://clickhouse.com/docs/en/operations/opentelemetry)
- [ClickHouse KB: Collect and Draw Query Traces](https://clickhouse.com/docs/knowledgebase/collect-and-draw-traces)
- [ClickHouse KB: send_logs_level](https://clickhouse.com/docs/knowledgebase/send_logs_level)
- [ClickHouse PR #39170: opentelemetry_trace_processors setting](https://github.com/ClickHouse/ClickHouse/pull/39170)

## Issues Found
No technical issues found.

All settings, system tables, and functions referenced in the post were verified against official ClickHouse documentation:
- `query_profiler_real_time_period_ns` and `query_profiler_cpu_time_period_ns` — correct names; nanoseconds units; default ~1 sample/sec.
- `system.trace_log` columns (`trace_type`, `trace`, `query_id`) — correct.
- `addressToSymbol(UInt64)` and `demangle(String)` — correct usage; designed to be combined for stack symbolization.
- `opentelemetry_start_trace_probability` and `opentelemetry_trace_processors` — both real settings (the latter was added in PR #39170).
- `system.opentelemetry_span_log` — correct table name.
- `send_logs_level = 'trace'` — `trace` is a valid log level.

## Review Notes
- The post is a concise practical guide. It does not mention that `system.trace_log` and `system.opentelemetry_span_log` must be enabled in `config.xml` (they are enabled by default in recent versions, but operators occasionally disable them); a future revision could note this caveat.
- The flame graph snippet pipes to `flamegraph.pl`, which expects "stack samples" format (`stack count`). The output uses TabSeparated with `stack` and `samples` columns — this works with `flamegraph.pl` since it parses whitespace-separated `stack count` lines.
- The query ID lookup uses `query LIKE '%event_type%'` which is illustrative; in practice users may also leverage `query_id` from client output or `clickhouse-client --query_id=...`.
