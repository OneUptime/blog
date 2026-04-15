# Validation Summary: How to Calculate Moving Averages in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- ClickHouse window functions (`avg`, `lag`, `lagInFrame`, `groupArray` with `OVER`)
- ClickHouse array functions (`arrayAvg`, `arraySlice`)
- ClickHouse aggregate functions (`exponentialMovingAverage`)
- ClickHouse state functions (`initializeAggregation`, `runningAccumulate`)

## Sources Consulted
- ClickHouse documentation: Window Functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: exponentialMovingAverage — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/exponentialMovingAverage
- ClickHouse documentation: initializeAggregation — https://clickhouse.com/docs/en/sql-reference/functions/other-functions#initializeaggregation
- ClickHouse documentation: runningAccumulate — https://clickhouse.com/docs/en/sql-reference/functions/other-functions#runningaccumulate
- ClickHouse documentation: Aggregate Functions reference — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference

## Issues Found

### Issue 1: Missing `timeunit` argument in `exponentialMovingAverage` usage (EMA section)
- **What was wrong:** `initializeAggregation('exponentialMovingAverage(0.2)', revenue)` only passed one input argument (`revenue`), but `exponentialMovingAverage(x)(value, timeunit)` requires two input arguments: `value` and `timeunit`. This would produce a runtime error.
- **What was changed:** Added `toUInt32(day)` as the second argument: `initializeAggregation('exponentialMovingAverage(0.2)', revenue, toUInt32(day))`. This converts the `Date` to a numeric day index, which serves as the required time unit.
- **Why:** The `exponentialMovingAverage` function needs a time index to properly weight values by their temporal distance. Without it, the query fails.

### Issue 2: Window function nested inside aggregate function (Comparing Periods section)
- **What was wrong:** The query used `sum(lagInFrame(revenue, 365, 0) OVER (ORDER BY day))` inside a `GROUP BY` clause. Window functions are evaluated after aggregation and cannot be nested inside aggregate functions like `sum()`. This is invalid SQL and would produce an error.
- **What was changed:** Restructured the subquery to first aggregate daily revenue in an inner subquery, then apply `lagInFrame` as a standalone window function in an outer query layer, before passing results to the final moving average window.
- **Why:** Window functions and aggregate functions operate at different stages of query execution. The fix separates them into proper query layers: aggregate first, then apply window functions on the aggregated results.

## Review Notes
- In the "Moving Average with Array Functions" section, the `arraySlice(groupArray(...), 1)` call is technically redundant since slicing from position 1 returns the full array. It works correctly but could be simplified to just `arrayAvg(groupArray(revenue) OVER (...))`. Left as-is since it is not incorrect.
- The `lagInFrame(revenue, 365, 0)` in the Comparing Periods section looks back 365 rows, not 365 calendar days. If there are gaps in the daily data (missing days), this will not align with the same date from the prior year. This is a conceptual limitation worth noting but is inherent to row-based lag functions.
- The Weighted Moving Average section will return NULL for the first 3 rows where `lag` values are unavailable. This is expected behavior but could surprise readers unfamiliar with NULL propagation in arithmetic expressions.
