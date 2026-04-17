# Validation Summary: How to Use ClickHouse for Application Performance Monitoring (APM)

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, MaterializedView, codecs, bloom filter index, TTL)
- OpenTelemetry (spans, trace_id/span_id, status codes, attributes)
- SQL (ClickHouse dialect)
- Mermaid (architecture diagram)

## Sources Consulted
- ClickHouse docs — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse docs — Materialized Views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse docs — Quantile aggregate state/merge functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs — Codecs (Delta, DoubleDelta, LZ4, ZSTD): https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse docs — Data skipping indexes (bloom_filter): https://clickhouse.com/docs/en/optimize/skipping-indexes
- ClickHouse docs — LowCardinality and FixedString types
- OpenTelemetry specification — Trace data model (trace_id 16 bytes / 32 hex, span_id 8 bytes / 16 hex): https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry status code enum (STATUS_CODE_UNSET / OK / ERROR)
- Apdex specification: https://www.apdex.org/

## Issues Found
1. **Service Dependency Map JOIN missed `trace_id`**
   - The original query joined `otel_spans child` to `otel_spans parent` only on `child.parent_span_id = parent.span_id`. OpenTelemetry span IDs are 64-bit (8 bytes) and are only required to be unique within a trace, so a parent_span_id from one trace can collide with a span_id from another trace, causing incorrect caller→callee edges.
   - Fixed the JOIN to also match on `child.trace_id = parent.trace_id`.

2. **Inaccurate latency claim in Summary**
   - The summary stated "30-second query latency for P99 percentile queries over the last 24 hours". This contradicts the introduction (which highlights sub-second queries) and is not what materialized-view-backed `quantileMerge` queries on a 1-minute pre-aggregated table would deliver — these typically respond in well under a second.
   - Updated to "sub-second query latency", which is consistent with the post's intro and with realistic ClickHouse performance for this schema.

## Review Notes
- `FixedString(32)` for trace_id and `FixedString(16)` for span_id correctly match the hex-encoded 128-bit / 64-bit OpenTelemetry IDs.
- AggregatingMergeTree usage with `quantileState` in the materialized view and `quantileMerge` in the read-side query is correct ClickHouse syntax. The default `quantile` function is approximate (reservoir sampling); for stricter accuracy, `quantileTDigestState`/`quantileTDigestMerge` could be used in the future, but the current choice is acceptable for APM dashboards.
- `CODEC(Delta(8), LZ4)` on `UInt64` and `CODEC(DoubleDelta, LZ4)` on `DateTime64(9)` are valid; ZSTD is sometimes preferred over LZ4 as the secondary codec for time-series, but LZ4 is a reasonable speed/ratio trade-off.
- `TTL toDateTime(start_time) + INTERVAL 30 DAY` is valid: TTL requires a DateTime expression and `toDateTime(DateTime64)` is supported.
- The Apdex query uses `WITH T AS (SELECT ... AS threshold) ... CROSS JOIN T`. This works in ClickHouse, though the simpler form `WITH 500 * 1e6 AS threshold` would also work; left unchanged as it is not incorrect.
- The status code string `'STATUS_CODE_ERROR'` matches the OpenTelemetry proto enum string form. Note that some OTel collector exporters serialize the status code differently (e.g., `Error`, `Ok`, `Unset`); readers using the upstream collector ClickHouse exporter may need to adapt the literal to their exporter's convention. Not a defect in this self-contained schema.
- Mermaid diagram uses `\n` for line breaks, which is the legacy syntax but still renders correctly in current Mermaid versions.
