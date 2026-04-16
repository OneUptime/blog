# Validation Summary: How to Use Moving Averages with Window Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL / window functions)
- Window functions: `avg() OVER`, `count() OVER`, `stddevPop() OVER`, `lagInFrame()`
- MergeTree engine
- Date/time functions (`toStartOfHour`)
- Statistical concepts: Simple Moving Average (SMA), Weighted Moving Average (WMA), Bollinger Bands

## Sources Consulted
- ClickHouse window functions reference: https://clickhouse.com/docs/en/sql-reference/window-functions/
- ClickHouse `lagInFrame` reference: https://clickhouse.com/docs/en/sql-reference/window-functions/lagInFrame
- ClickHouse GitHub issue #19857 (aggregate-over-aggregate in same query not supported): https://github.com/ClickHouse/ClickHouse/issues/19857
- Altinity KB on lag/lead in ClickHouse: https://kb.altinity.com/altinity-kb-queries-and-syntax/lag-lead/

## Issues Found

1. **`lag()` function does not exist in ClickHouse (Weighted Moving Average section).**
   - The original WMA example used `lag(value, 4, 0) OVER (ORDER BY metric_date)`. ClickHouse does not implement the standard SQL `LAG`/`LEAD`; it provides `lagInFrame` / `leadInFrame` instead. To match standard SQL `LAG` semantics (look back across the full partition, not just the default preceding-rows frame), the frame must be explicitly set to `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`, as recommended by the official ClickHouse docs' support matrix.
   - Fix: replaced every `lag(...)` with `lagInFrame(..., ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)` and added a short comment noting the ClickHouse-specific naming.

2. **Window function over an aggregate in the same query is not supported (Practical Example: Revenue Smoothing).**
   - The original query used `avg(sum(revenue)) OVER (...)` together with `GROUP BY hour`. ClickHouse does not support window functions over aggregate results in the same query level (see GitHub issue #19857 — `SUM(SUM(col)) OVER (...)` fails).
   - Fix: restructured the query to first aggregate in a subquery (`toStartOfHour`, `sum(revenue)`), then apply the moving-average window function on the outer query over the subquery's `hourly_revenue` column. Added a comment explaining the constraint.

## Review Notes
- All other code samples are technically sound: `avg()`, `count()`, and `stddevPop()` as windowed aggregates with `ROWS BETWEEN N PRECEDING AND CURRENT ROW` frames are all supported in ClickHouse.
- The description mentions "exponential smoothing," but no EMA code example is shown; only the three types are listed and then SMA/WMA are implemented. This is a minor content gap, not a technical inaccuracy, so it was left unchanged per the "fix only technical errors" scope.
- The WMA `lagInFrame` workaround with `UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` is slightly less efficient than a single windowed-aggregate pass, but it is the idiomatic ClickHouse way to emulate standard SQL LAG for this use case.
