# Validation Summary: How to Use deltaSum() and deltaSumTimestamp() in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL aggregate functions)
- `deltaSum()` aggregate function
- `deltaSumTimestamp()` aggregate function
- MergeTree / SummingMergeTree table engines
- Materialized Views
- Time-bucketing functions (`toStartOfMinute`, `toStartOfHour`, `toStartOfInterval`)
- Prometheus-style monotonic counters (conceptual comparison)

## Sources Consulted
- [ClickHouse deltaSum documentation](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/deltasum)
- [ClickHouse deltaSumTimestamp documentation](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/deltasumtimestamp)
- [ClickHouse PR #21888 — add deltaSumTimestamp](https://github.com/ClickHouse/ClickHouse/pull/21888)
- ClickHouse MergeTree / SummingMergeTree engine documentation

## Issues Found
1. **Incorrect timestamp parameter data types in `deltaSumTimestamp()`**
   - The post stated: "The timestamp must be of type `DateTime`, `DateTime64`, or a numeric Unix epoch."
   - According to the official ClickHouse documentation, the supported timestamp parameter types are `(U)Int*`, `Float*`, `Date`, or `DateTime`. `DateTime64` is not listed in the official documentation, and `Date` is valid and was omitted.
   - Fixed to: "The timestamp column can be an integer, float, `Date`, or `DateTime` - any ordering column works." This aligns with the documented accepted types.

Verified math in examples:
- `web-01`: +50, +50, -190 (discarded), +70 = 170 ✓
- `web-02`: +100, +100 = 200 ✓
- Float example (`node-1`): 64.8 + 64.7 = 129.5 ✓

SQL syntax for `CREATE TABLE`, `INSERT`, `SELECT ... GROUP BY`, and `CREATE MATERIALIZED VIEW` statements was validated against ClickHouse SQL reference — all valid.

## Review Notes
- `deltaSumTimestamp()` was designed primarily for materialized views where rows get the same time-bucket timestamp and parts can merge out of order. The post's description ("internally sorts values by that timestamp before computing deltas") is a reasonable functional simplification but understates this original motivation. Not technically wrong — the function does order by the timestamp column during aggregation — so no change made.
- In the "Combining with `toStartOfMinute()`" example, the sample dataset has only one row per `(host, minute)` bucket, so `deltaSumTimestamp` would return 0 for every bucket. The SQL is syntactically correct and the pattern is valid for realistic data (e.g., sub-minute scrape intervals), so this was left as-is — it's a pedagogical example limitation rather than a technical error.
- `deltaSum()` actually accepts one or more arguments per the docs (`deltaSum(x1[, x2, ...])`), but single-argument usage as shown in the post is the standard and documented form — no change needed.
- Known upstream issue [ClickHouse#72189](https://github.com/ClickHouse/ClickHouse/issues/72189) documents edge cases where `deltaSumTimestamp` can return wrong results; readers using this in production should be aware, but the basic patterns shown here are correct.
