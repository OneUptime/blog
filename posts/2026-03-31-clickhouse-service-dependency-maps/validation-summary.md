# Validation Summary: How to Build Service Dependency Maps with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, LowCardinality type, aggregate functions: quantile, countIf, countDistinct)
- OpenTelemetry distributed tracing (span model, status codes, parent-child relationships)
- SQL (JOINs, subqueries, BETWEEN, INTERVAL expressions)

## Sources Consulted
- ClickHouse SQL reference for CREATE TABLE, MergeTree engine, PARTITION BY, ORDER BY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate function reference (quantile, countIf, countDistinct, count, round): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse type system (LowCardinality, Float64, UInt8, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse date/time functions (toYYYYMMDD, toDateTime, intDiv, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- OpenTelemetry trace data model (span relationships, status codes): https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- **Latency Heatmap: overlapping bucket boundaries causing double-counting.** The original query used `countIf(duration_ms BETWEEN 10 AND 100)` and `countIf(duration_ms BETWEEN 100 AND 500)`, which both include rows where `duration_ms = 100` (since SQL BETWEEN is inclusive on both ends). This means any call with exactly 100ms latency would be counted in two buckets simultaneously. Fixed by replacing BETWEEN with explicit range comparisons: `duration_ms >= 10 AND duration_ms < 100` for the second bucket and `duration_ms >= 100 AND duration_ms <= 500` for the third bucket, producing non-overlapping, contiguous ranges.

## Review Notes
- The "Detect Circular Dependencies" query only finds 2-hop cycles (A calls B and B calls A). Longer cycles (A -> B -> C -> A) are not detected. This is a reasonable simplification for a blog post but worth noting for readers who need full cycle detection.
- The self-join in "Populate Edges from Trace Spans" joins on `parent_span_id = span_id` without also joining on `trace_id`. While span IDs are typically globally unique (random 16-byte values), adding `trace_id` to the join condition would be more robust and could improve query performance on large datasets.
- The `countDistinct` function used in "Find Critical Services" is a ClickHouse alias for `uniqExact`. This is valid but readers should be aware that `uniqExact` is the canonical ClickHouse name.
