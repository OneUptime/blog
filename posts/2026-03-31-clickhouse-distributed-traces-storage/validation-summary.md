# Validation Summary: How to Store and Query Distributed Traces in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, TTL, Map columns, LowCardinality, FixedString)
- OpenTelemetry trace data model (trace_id, span_id, status codes, span kinds)
- SQL (analytical queries: percentiles, error rates, service dependency extraction)
- W3C Trace Context (implicit, via 16-byte trace IDs and 8-byte span IDs)

## Sources Consulted
- ClickHouse type conversion functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions (`toUnixTimestamp64Micro`, `fromUnixTimestamp64Micro`, `hex`, `unhex`)
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions (`now`, `now64`)
- ClickHouse MergeTree engine / TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Map data type: https://clickhouse.com/docs/en/sql-reference/data-types/map
- ClickHouse aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile and `countIf` combinator
- OpenTelemetry span specification (status codes Unset=0, OK=1, Error=2; SpanKind enum): https://opentelemetry.io/docs/specs/otel/trace/api/
- W3C Trace Context (16-byte trace-id, 8-byte parent-id): https://www.w3.org/TR/trace-context/

## Issues Found
- `toUnixTimestamp64Micro(now() - INTERVAL 1 HOUR)` used in four queries (latency percentiles, error rate, slow trace detection, service dependency map). Per the official ClickHouse docs, `toUnixTimestamp64Micro` expects a `DateTime64` argument, but `now()` returns `DateTime`. While implicit casting may succeed on some versions, it is not part of the documented contract. Changed `now()` to `now64()` in all four queries so the input type matches the function signature and the microsecond conversion is reliable across versions.

## Review Notes
- Schema choices are sound: `FixedString(16)` for trace_id and `FixedString(8)` for span_id match the W3C Trace Context byte lengths; OpenTelemetry status code values (0/1/2) are correct.
- `fromUnixTimestamp64Micro(start_time_us) + INTERVAL 30 DAY` as a TTL expression is valid — the function accepts `Int64` and returns `DateTime64(6)`, which is a valid TTL type.
- The ORDER BY key `(service_name, operation_name, start_time_us)` is good for service-scoped queries but is not ideal for trace-id lookups ("Finding a Trace by ID"), which will require a full scan over the range. In production, adding a skipping index (e.g., bloom filter) on `trace_id`, or maintaining a secondary projection / materialized view keyed by `trace_id`, would make single-trace lookups fast. Worth noting as a future improvement, not a correctness issue.
- The `attributes['peer.service']` approach works but will return an empty string for missing keys on `Map(String, String)` — the query's `!= ''` filter handles this correctly.
- The queries rely on the OpenTelemetry convention that `peer.service` is present on CLIENT spans; real-world telemetry may use `server.address` or other attributes. This is a data-quality caveat rather than a technical error.
