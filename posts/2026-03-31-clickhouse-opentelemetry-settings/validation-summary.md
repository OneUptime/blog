# Validation Summary: How to Configure ClickHouse OpenTelemetry Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (opentelemetry_span_log, trace context propagation)
- OpenTelemetry (W3C Trace Context / traceparent header)
- Vector (data pipeline for exporting spans)
- curl (HTTP requests with trace context)

## Sources Consulted
- ClickHouse official documentation on opentelemetry_span_log: https://clickhouse.com/docs/en/operations/opentelemetry
- ClickHouse official documentation on system tables: https://clickhouse.com/docs/en/operations/system-tables/opentelemetry_span_log
- ClickHouse source code (Settings.cpp, executeQuery.cpp, OpenTelemetryTraceContext.cpp) for verifying settings and span attributes
- Vector documentation on source types: https://vector.dev/docs/reference/configuration/sources/
- W3C Trace Context specification for traceparent header format

## Issues Found

### 1. Invalid SQL SET statements for trace context (was lines 55-58)
**What was wrong:** The post used `SET opentelemetry_traceparent` and `SET opentelemetry_tracestate` as SQL session settings. Neither of these are valid ClickHouse SQL settings. Trace context for native protocol connections is passed via `clickhouse-client` CLI flags.
**What was changed:** Replaced the SQL SET example with a `clickhouse-client` command using `--opentelemetry-traceparent` and `--opentelemetry-tracestate` CLI flags.

### 2. Incorrect column name `attribute` in span log queries (was lines 82 and 107)
**What was wrong:** The post referenced an `attribute` column (singular) in `system.opentelemetry_span_log`. The actual columns are `attribute.names` (Array(String)) and `attribute.values` (Array(String)) — two parallel arrays, not a single column.
**What was changed:** Updated both SQL queries to select `attribute.names` and `attribute.values` instead of `attribute`.

### 3. Non-existent `event_time` column in span log queries (was lines 84 and 109)
**What was wrong:** The post used `WHERE event_time >= now() - INTERVAL 1 HOUR` and a similar filter. The `opentelemetry_span_log` table has no `event_time` column; it has `finish_date` (Date), `start_time_us` (UInt64 microseconds), and `finish_time_us` (UInt64 microseconds).
**What was changed:** Replaced with `WHERE finish_date >= today() - 1 AND start_time_us >= (toUnixTimestamp(now()) - 3600) * 1000000` using the actual columns available.

### 4. Non-existent Vector `clickhouse` source type (was lines 96-98)
**What was wrong:** The Vector configuration used `type: clickhouse` as a source. Vector does not have a `clickhouse` source type — ClickHouse is only available as a Vector sink (destination), not a source.
**What was changed:** Replaced with `type: exec` source using `clickhouse-client` with `mode: scheduled` and `exec_interval_secs: 60` to periodically poll the span log table.

### 5. Wrong configuration level for `opentelemetry_start_trace_probability` (was lines 124-128)
**What was wrong:** The post placed `opentelemetry_start_trace_probability` directly under `<clickhouse>` in server config XML. This is a session/profile-level setting, not a server-level parameter, so placing it there would have no effect.
**What was changed:** Updated to show the correct configuration in a user profile XML block (`<profiles><default>...</default></profiles>`) and added an alternative `SET` statement example.

### 6. Incorrect span attribute names in attributes table (was lines 136-143)
**What was wrong:** The table listed `db.system`, `db.user`, and `net.peer.ip` as span attributes. ClickHouse does not store `db.system` or `net.peer.ip`. The user attribute is stored as `clickhouse.user`, not `db.user`.
**What was changed:** Removed `db.system` and `net.peer.ip`. Changed `db.user` to `clickhouse.user`. Added actually-stored attributes: `clickhouse.query_id`, `clickhouse.read_bytes`, `clickhouse.written_bytes`, and `clickhouse.memory_usage`.

## Review Notes
- The overall architecture description (ClickHouse writes spans to a system table, external agent forwards them to a collector) is accurate and well-explained.
- The mermaid diagram is a helpful visualization of the data flow.
- The opentelemetry_span_log server configuration XML block appears correct with appropriate settings for flush_interval_milliseconds, max_size_rows, reserved_size_rows, and TTL.
- The W3C traceparent header format used in examples (`00-{trace_id}-{span_id}-{flags}`) is correct.
- The Vector export pipeline, while fixed to use the `exec` source, is a reasonable approach. An alternative would be to use Vector's `http_client` source to poll the ClickHouse HTTP interface directly.
