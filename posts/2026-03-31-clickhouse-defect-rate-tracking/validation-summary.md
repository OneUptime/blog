# Validation Summary: How to Build Defect Rate Tracking with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, window functions, aggregate combinators)
- Quality / Manufacturing analytics concepts (DPM, Pareto, escaped defects)

## Sources Consulted
- ClickHouse Window Functions reference: https://clickhouse.com/docs/en/sql-reference/window-functions/
- ClickHouse `lagInFrame` documentation: https://clickhouse.com/docs/en/sql-reference/window-functions/lagInFrame
- ClickHouse Date/Time functions (`today`, `toStartOfWeek`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse aggregate combinators (`countIf`): https://clickhouse.com/docs/examples/aggregate-function-combinators/countIf
- ClickHouse NULL functions (`nullIf`): https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse data types (`LowCardinality`, `UUID`, `UInt32`, `DateTime`): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine reference: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Unsupported window function `lag()` in the Weekly DPM query.**
   - ClickHouse does not officially support the standard SQL `lag()` window function. Only `lagInFrame()` is supported.
   - Changed `lag(weekly_dpm) OVER (PARTITION BY line_id ORDER BY week)` to `lagInFrame(weekly_dpm) OVER (PARTITION BY line_id ORDER BY week)`.

2. **Nested window functions in the Defect Type Pareto query.**
   - The original `cumulative_pct` expression wrapped a window function inside another window function: `sum(round(... sum(sum(quantity_defective)) OVER () ...)) OVER (ORDER BY ...)`. ClickHouse does not allow a window function as the argument of another window function.
   - Restructured the cumulative percentage calculation as `round(sum(sum(quantity_defective)) OVER (ORDER BY sum(quantity_defective) DESC) / sum(sum(quantity_defective)) OVER () * 100, 2)`. This is equivalent in intent (running sum of defects divided by grand total, expressed as a percentage), uses two non-nested window functions over a GROUP BY aggregate, and runs in ClickHouse.

## Review Notes
- The `detected_at` column stores categorical strings (`in_process`, `end_of_line`, `customer`) rather than a timestamp; the `_at` suffix is a slightly misleading naming choice but not a technical error.
- The default window frame for `lagInFrame(x)` (with the implicit `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` frame after `ORDER BY`) returns the value one row before the current row, which matches the post's intent for the weekly DPM delta.
- `today()` returns a `Date`; comparing it with the `DateTime` column `recorded_at` works due to ClickHouse's implicit conversion. The Critical Defect Alert `WHERE recorded_at >= today()` correctly filters records from midnight today onward.
- `nullIf(sum(quantity_inspected), 0)` correctly avoids divide-by-zero by propagating NULL through `round()`.
- Schema and other queries (`countIf`, `toStartOfWeek`, `toYYYYMM`, `MergeTree` partitioning/ordering) are all syntactically and semantically correct.
