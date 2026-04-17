# Validation Summary: How to Use ClickHouse for Clickstream Analysis

## Status
validated

## Post Type
Tutorial / Guide — practical ClickHouse SQL recipes for clickstream analytics.

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse SQL dialect
  - `windowFunnel` parametric aggregate
  - `sequenceMatch` parametric aggregate
  - `argMin` / `argMax` aggregates
  - `leadInFrame` window function
  - `LowCardinality`, `FixedString`, `DateTime64` types
  - Compression codecs (`LZ4`, `ZSTD`, `DoubleDelta`)
  - TTL expressions
- Mermaid (for the architecture diagram)

## Sources Consulted
- ClickHouse aggregate functions: https://clickhouse.com/docs/sql-reference/aggregate-functions
- `windowFunnel`: https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions#windowfunnel
- `sequenceMatch`: https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions#sequencematch
- `argMin`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmin
- `argMax`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- `leadInFrame`: https://clickhouse.com/docs/sql-reference/window-functions/leadInFrame
- MergeTree TTL: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- `toDateTime`: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions#todatetime

## Issues Found

1. **"Most Visited Pages" — nested aggregates.** The original query used `round(avg(dateDiff('second', min(ts), max(ts))), 0) AS avg_time_on_page`. ClickHouse forbids nesting aggregate functions (it raises "Aggregate function ... is found inside another aggregate function"), so the query would not run. Semantically the expression was also wrong: with `GROUP BY url`, `min(ts)` and `max(ts)` would span all users/sessions that ever hit that URL, not time-on-page. Fixed by removing the `avg_time_on_page` column rather than hand-rolling a correct (and much more involved) time-on-page computation, which would be out of scope for the query's intent.

2. **"User Path Analysis" — `leadInFrame` default frame.** The original window used `leadInFrame(url) OVER (PARTITION BY user_id, session_id ORDER BY ts)` with no explicit frame. Per ClickHouse docs, the default frame with `ORDER BY` is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, so `leadInFrame` has no rows after the current row inside the frame and returns the default value (empty string). The docs explicitly recommend `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to get standard `LEAD`-like behavior. Fixed by adding that explicit frame clause.

3. **"Conversion Rate by Referrer" — invalid outer aggregation.** The outer `SELECT` used `argMin(referrer, ts) AS entry_referrer` and `GROUP BY entry_referrer`, but (a) the subquery output does not expose `ts`, so `argMin(referrer, ts)` would fail to resolve, and (b) you cannot `GROUP BY` an aggregate expression alias. The subquery already produces one row per session with the entry `referrer` resolved, so the outer query should just group by `referrer`. Also replaced `conversions / sessions` (which relied on referring to aliases defined in the same SELECT list) with the explicit `countIf(converted) / count()` form to keep the CVR calculation unambiguous.

## Review Notes

- The "Session Reconstruction" section says sessions are grouped "using a 30-minute inactivity gap", but the query simply groups by the pre-existing `session_id`. That's typical — `session_id` is normally assigned upstream by the event collector using the 30-minute rule — so this is not technically incorrect, just implicit. No change made.
- `TTL toDateTime(ts) + INTERVAL 1 YEAR` is valid: TTL expressions require `Date`/`DateTime`, and `toDateTime()` is the standard way to downcast `DateTime64` for TTL arithmetic. Sub-second precision is lost but that's acceptable for a retention TTL.
- The `windowFunnel(3600)(...)` call uses 3600 as the window in seconds, which matches the `DateTime64` timestamp unit convention (seconds). Correct.
- The "10-15x" storage reduction claim for `LowCardinality` vs `String` is reasonable for low-cardinality categorical columns; actual ratio depends on data distribution but is in the right ballpark.
- `max(event_type = 'purchase')` relies on boolean-to-`UInt8` coercion, which ClickHouse performs; `max` over `UInt8` returns `UInt8`, and `countIf` accepts that as a condition. Correct.
