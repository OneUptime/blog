# Validation Summary: How to Calculate Month-over-Month Growth Rate in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, window functions, aggregate functions)
- SQL window functions (`lag`, `lagInFrame`)
- ClickHouse date functions (`toStartOfMonth`, `toStartOfWeek`, `today()`)
- ClickHouse aggregate functions (`argMin`, `argMax`, `uniq`)

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on `lag` window function: https://clickhouse.com/docs/en/sql-reference/window-functions#lag
- ClickHouse documentation on `lagInFrame`: https://clickhouse.com/docs/en/sql-reference/window-functions#laginframex-offset-default
- ClickHouse documentation on `argMin` / `argMax`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmin
- ClickHouse documentation on date functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found

### Issue 1: `lagInFrame` returns 0 (not NULL) for missing rows with non-Nullable types
**What was wrong:** All four SQL examples used `lagInFrame` without an explicit default value. For non-Nullable numeric columns (which is what `sum()`, `uniq()`, and `count()` produce), `lagInFrame` returns `0` — not `NULL` — when there is no preceding row in the frame. This means:
- In the first query, `WHERE prev_revenue IS NOT NULL` would never filter out the first row; instead it would pass through with `prev_revenue = 0`, causing a division-by-zero result (inf or NaN).
- In the other queries, the first row would similarly produce division by zero.

**What was changed:** Replaced all `lagInFrame(...)` calls with `lag(...)`. The standard `lag()` function (available since ClickHouse 21.4) returns `NULL` when there is no preceding row, regardless of the column's Nullable status. This makes `WHERE prev_revenue IS NOT NULL` work correctly and avoids division-by-zero on the first row of each query.

### Issue 2: Compound Average Monthly Growth Rate used `min`/`max` instead of first/last chronological values
**What was wrong:** The CAGR query used `min(revenue) AS first_val` and `max(revenue) AS last_val`. The CAGR formula requires the **first chronological period's value** and the **last chronological period's value**. Using `min`/`max` returns the smallest and largest revenue values respectively, which are only correct if revenue happens to increase monotonically every month. In any realistic dataset with fluctuations, these would return incorrect values.

**What was changed:** Replaced `min(revenue)` with `argMin(revenue, month)` (returns revenue from the earliest month) and `max(revenue)` with `argMax(revenue, month)` (returns revenue from the latest month). Also removed the misleading comment "assumes last month is the latest".

### Issue 3: Summary text referenced `lagInFrame` after code was changed to `lag`
**What was changed:** Updated the summary paragraph and description to reference `lag` instead of `lagInFrame` to match the corrected code examples.

## Review Notes
- The post's approach of using CTEs to aggregate first and then apply window functions in a second pass is a sound and recommended pattern for ClickHouse.
- The `lag()` function is the standard SQL approach and is preferred over `lagInFrame` for this use case. `lagInFrame` is a ClickHouse-specific function that operates strictly within the window frame boundaries, which makes its behavior more sensitive to frame specification. `lag()` is simpler and more intuitive.
- The WoW query uses `today() - 14` which works but only captures ~2 weeks of data, meaning you'll get at most 2-3 weekly buckets. This is technically correct for a week-over-week comparison but the lookback could be wider if more history is desired.
