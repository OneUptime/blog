# Validation Summary: How to Implement Exponential Decay Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL)
- Exponential decay / exponential moving average (EMA)
- Recursive CTEs
- Window functions

## Sources Consulted
- ClickHouse docs — `exponentialMovingAverage`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/exponentialMovingAverage
- ClickHouse docs — `WITH` (recursive CTEs): https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse docs — math functions (`exp`): https://clickhouse.com/docs/en/sql-reference/functions/math-functions
- ClickHouse docs — date/time functions (`dateDiff`, `addSeconds`, `toUnixTimestamp`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
- **EMA query missing `OVER` clause.** The original query `exponentialMovingAverage(5)(value, toUnixTimestamp(ts)) AS ema` was invoked as a plain aggregate alongside non-aggregated columns (`ts`, `value`), which does not produce per-row EMA values. Added `OVER (ORDER BY ts)` so the function is used as a window aggregate, matching ClickHouse's documented usage pattern.
- **Incorrect claim that ClickHouse lacks a built-in EMA window function.** `exponentialMovingAverage` is ClickHouse's built-in aggregate and supports the `OVER` clause for windowed use. Rewrote the sentence to accurately describe it as a built-in aggregate function that can be used as a window function.

## Review Notes
- `exp()`, `dateDiff('second', ...)`, `toUnixTimestamp()`, `addSeconds()`, and `round()` are all valid ClickHouse functions and are used correctly.
- `WITH RECURSIVE` is supported in ClickHouse (introduced with the new analyzer in v24.3+). The recursive CTE example assumes strictly 60-second-spaced data due to the `addSeconds(e.ts, 60)` join condition — this is a modeling caveat rather than a technical error.
- Per ClickHouse's docs, `timeunit` in `exponentialMovingAverage` is an index of a time interval, so passing `toUnixTimestamp(ts)` makes the half-life parameter count in seconds (here, 5 seconds). For longer half-lives it is common to bucket with `intDiv(toUInt32(ts), N)`; the post's usage is correct but users should be aware the unit of the half-life is tied to the `timeunit` expression.
