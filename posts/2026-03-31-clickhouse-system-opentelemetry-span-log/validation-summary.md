# Validation Summary: How to Use system.opentelemetry_span_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, configuration)
- OpenTelemetry (W3C Trace Context, distributed tracing)
- SQL (ClickHouse SQL dialect)

## Sources Consulted
- [ClickHouse system.opentelemetry_span_log documentation](https://clickhouse.com/docs/operations/system-tables/opentelemetry_span_log) — verified column names and types
- [Tracing ClickHouse with OpenTelemetry](https://clickhouse.com/docs/operations/opentelemetry) — verified configuration approach and `opentelemetry_start_trace_probability` setting
- [GitHub Issue #34369: Use FixedString(16) instead of UUID for OpenTelemetry trace_id](https://github.com/ClickHouse/ClickHouse/issues/34369) — confirmed `trace_id` is currently `UUID` type, not `FixedString(16)`

## Issues Found

1. **`trace_id` column type was wrong**: The post listed `trace_id` as `FixedString(16)` but the actual type in ClickHouse is `UUID`. Fixed the Key Columns table.

2. **TTL config referenced wrong column**: The `<ttl>` element in the config XML used `event_date` which does not exist in `opentelemetry_span_log`. The correct date column is `finish_date`. Changed to `finish_date + INTERVAL 7 DAY DELETE`.

3. **Sampling config section was fabricated**: The post showed an `<opentelemetry_trace_processors>` XML config block with a `<sampling_ratio>` element. This config section does not exist in ClickHouse. The correct mechanism is the `opentelemetry_start_trace_probability` query-level setting. Replaced the XML snippet with the correct `SET` statement.

4. **`opentelemetry_start_new_trace` setting does not exist**: The post used `SETTINGS opentelemetry_start_new_trace = 1` which is not a valid ClickHouse setting. The correct setting is `opentelemetry_start_trace_probability = 1`. Fixed the SQL example.

5. **`unhex()` used for UUID comparison**: The Reconstructing a Full Trace query used `WHERE trace_id = unhex('4bf92f3577b34da6a3ce929d0e0e4736')` which is incorrect because `trace_id` is `UUID` type and `unhex()` returns `String`. Changed to `toUUID('4bf92f35-77b3-4da6-a3ce-929d0e0e4736')`.

## Review Notes
- The Key Columns table omits `kind` (Enum8), `status_code` (Enum8), and `status_message` (String) columns that also exist in the table. The post labels the section "Key Columns" so this is acceptable, but readers may want to check the full schema.
- There is an open ClickHouse issue (#34369) proposing to change `trace_id` from `UUID` to `FixedString(16)` since not all OpenTelemetry trace IDs are valid UUIDs. If this change lands in a future ClickHouse version, the column type in this post would need to be updated again.
- The mermaid diagram showing span hierarchy is illustrative rather than exact — ClickHouse's actual internal span names may differ from what's shown.
