# Validation Summary: How to Use Distributed Tracing with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (query_log, opentelemetry_span_log, Distributed engine, clusterAllReplicas, MergeTree)
- OpenTelemetry (W3C Trace Context, OTLP)
- OpenTelemetry Collector (ClickHouse exporter)
- SQL (DDL, aggregations, Map / FixedString types)
- Bash / curl / systemd

## Sources Consulted
- [Tracing ClickHouse with OpenTelemetry (ClickHouse Docs)](https://clickhouse.com/docs/operations/opentelemetry)
- [system.opentelemetry_span_log (ClickHouse Docs)](https://clickhouse.com/docs/operations/system-tables/opentelemetry_span_log)
- [ClickHouse source: `OpenTelemetrySpanLog.cpp`](https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/OpenTelemetrySpanLog.cpp)
- [ClickHouse source: `HTTPHandler.cpp` (traceparent parsing)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Server/HTTPHandler.cpp)
- [ClickHouse source: `SystemLog.cpp` (engine config parsing)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/SystemLog.cpp)
- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Collector Contrib — ClickHouse exporter README](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md)
- [ClickHouse issue #11987 — SET query_id feature request](https://github.com/ClickHouse/ClickHouse/issues/11987)
- [ClickHouse issue #34369 — UUID vs FixedString(16) for trace_id](https://github.com/ClickHouse/ClickHouse/issues/34369)

## Issues Found

1. **Invalid `SET query_id = '...'` statement.** `query_id` is not a session/query-level setting in ClickHouse; there is an open feature request (#11987) for this exact capability. Custom query IDs are set via the HTTP `query_id` URL parameter or `clickhouse-client --query_id` flag. Replaced the `SET query_id` example with HTTP and clickhouse-client invocations that pass `query_id` the supported way.

2. **Wrong HTTP header name for W3C trace context.** The post used `X-OpenTelemetry-Traceparent`. ClickHouse's `HTTPHandler.cpp` checks for the W3C-standard header `traceparent` (and companion `tracestate`). Changed the `curl` example to use `traceparent`.

3. **Non-existent OpenTelemetry SET settings.** The post set `opentelemetry_start_new_trace`, `opentelemetry_trace_id`, and `opentelemetry_span_id`. None of these exist as ClickHouse settings — the only relevant setting is `opentelemetry_start_trace_probability`, and the trace/span IDs cannot be forced via `SET` (they come from `traceparent` or are generated server-side). Replaced the snippet with `SET opentelemetry_start_trace_probability = 1;` and added a mention of `--opentelemetry-traceparent` / `--opentelemetry-tracestate` client flags, which are the documented manual-testing hooks.

4. **Incorrect UUID comparison in `system.opentelemetry_span_log` query.** `trace_id` in `system.opentelemetry_span_log` is a `UUID` column. Comparing it to an unhyphenated 32-char hex string (`'4bf92f3577b34da6a3ce929d0e0e4736'`) will not parse as a UUID. Changed the predicate to `toUUID('4bf92f35-77b3-4da6-a3ce-929d0e0e4736')`. The Part 2 `otel_traces` table defines `trace_id` as `FixedString(16)`, so its `WHERE trace_id = unhex(...)` comparison is correct and was left alone.

Minor adjustments alongside the above: replaced `host_name` (not a column on `system.query_log`) with `hostName()` in the cluster-wide query_log example.

## Review Notes
- The custom `otel_traces` schema in Part 2 is a reasonable hand-rolled shape but differs from the schema the OpenTelemetry Collector Contrib ClickHouse exporter actually creates (the exporter auto-creates its own table with columns like `Timestamp`, `TraceId`, `SpanId`, `ParentSpanId`, `SpanName`, `ServiceName`, `Duration`, `StatusCode`, etc., using PascalCase/CamelCase names). Readers who point the exporter at an existing table with the hand-rolled lowercase schema will need to disable auto-creation or align column names. This is a design choice, not a correctness bug, so it was left as-is.
- The ClickHouse exporter has been migrating Map-typed attribute columns to JSON (ClickHouse v25+). The post's use of `Map(LowCardinality(String), String)` is still supported but may be worth revisiting once JSON becomes the default in the exporter.
- The `<engine>` XML block uses `ENGINE = MergeTree ... TTL ...` which is parsed as a full storage clause by `SystemLog.cpp`'s `ParserStorageWithComment`, so it is valid.
