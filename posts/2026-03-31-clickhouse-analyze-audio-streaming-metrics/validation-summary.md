# Validation Summary: How to Analyze Audio Streaming Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, window functions, aggregate combinators)
- SQL (window functions, materialized views)
- Time-series analytics for audio streaming

## Sources Consulted
- ClickHouse window functions reference: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse leadInFrame / lagInFrame docs: https://clickhouse.com/docs/sql-reference/window-functions/leadInFrame
- ClickHouse date/time functions (dateDiff): https://clickhouse.com/docs/sql-reference/functions/date-time-functions#datediff
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse quantile reference: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse MergeTree / AggregatingMergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family

## Issues Found
1. **Unsupported `lead()` window function**: ClickHouse does not support the standard SQL `lead()` function; it only supports `leadInFrame()` (and `lagInFrame()`). Replaced both occurrences of `lead(ts) OVER (...)` with `leadInFrame(ts) OVER (...)` and added an explicit `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` frame so that `leadInFrame` can actually look at the next row (the default frame is `UNBOUNDED PRECEDING AND CURRENT ROW`, which would make lead-style lookups return the default/null).
2. **Event type inconsistency in buffering ratio query**: The schema defines buffering events as `'buffer_start'` and `'buffer_end'`, but the buffering ratio query filtered on `event_type = 'buffer'` (which never exists in the data). Changed both the `sumIf` predicate and the `WHERE event_type IN (...)` clause to use `'buffer_start'`, which correctly captures the duration until the next event (buffer_end or resume).

## Review Notes
- The `intDiv(position_ms, 30000) * 30` expression produces seconds rather than milliseconds — the column name `position_bucket_sec` matches this, so it's intentional and correct.
- The materialized view uses `countStateIf` and `avgState`; consumers must use the corresponding `-Merge` combinators (`countMerge`, `avgMerge`) when querying, but the post does not show that side — acceptable for a focused post.
- `dateDiff('millisecond', ...)` requires DateTime64 precision for the arguments, which the schema provides (`ts DateTime64(3)`), so this is fine.
- `PARTITION BY toYYYYMM(ts)` and `ORDER BY (session_id, ts)` on the raw events table is a reasonable default; for very high-cardinality session_id workloads, teams may prefer `(toDate(ts), session_id)` to keep the primary index compact, but this is a tuning consideration rather than a correctness issue.
