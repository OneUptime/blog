# Validation Summary: How to Calculate Percentiles Over Time Windows in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, aggregate functions, window functions)
- ClickHouse quantile function family (`quantile`, `quantiles`, `quantileExact`)
- ClickHouse date/time functions (`toStartOfFiveMinutes`, `toStartOfHour`, `today`, `now`)
- ClickHouse array functions (`arrayJoin`, `arrayFlatten`, `groupArray`)
- ClickHouse aggregate combinators (`countIf`)

## Sources Consulted
- ClickHouse `quantile` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse `quantileTDigest` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse `quantileExact` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexact
- ClickHouse `quantiles` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse window functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse date-time functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse `arrayJoin` documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse array data type and indexing: https://clickhouse.com/docs/sql-reference/data-types/array

## Issues Found

### 1. Incorrect algorithm description for `quantile()` function
- **What was wrong:** The post stated that `quantile()` uses "T-Digest approximation." According to the official ClickHouse documentation, `quantile()` uses **reservoir sampling** (with a reservoir size up to 8192), not T-Digest. The T-Digest variant is a separate function called `quantileTDigest()`.
- **What was changed:** Replaced "T-Digest approximation" with "reservoir sampling approximation" in the "Approximate vs. Exact Percentiles" section.
- **Why:** Accuracy matters when users are choosing between quantile function variants. Misidentifying the algorithm could lead to incorrect assumptions about memory usage and accuracy characteristics.

### 2. Broken sliding window percentile query
- **What was wrong:** The original query attempted to use `groupArray(latency_ms) OVER (ORDER BY bucket ROWS BETWEEN 11 PRECEDING AND CURRENT ROW)` directly on individual request rows. Since the subquery returned one row per request (not per bucket), the window frame `ROWS BETWEEN 11 PRECEDING AND CURRENT ROW` would slide over 12 individual rows rather than 12 five-minute buckets. Additionally, nesting `quantileExact()` around `arrayJoin(groupArray(...) OVER(...))` in the same SELECT level is not valid — aggregate functions cannot wrap window functions at the same query level.
- **What was changed:** Restructured into a correct 3-level query: (1) innermost query aggregates latency values into arrays per 5-minute bucket using `groupArray`, (2) middle query uses a window function to collect bucket arrays over a 12-bucket sliding window and `arrayFlatten` to merge them, (3) outer query uses `arrayJoin` to expand the array and `quantileExact` to compute P99. Added an explanatory paragraph after the query.
- **Why:** The original query would not produce correct rolling percentile results and could fail to execute. The fix ensures the window operates at bucket granularity and uses proper query nesting.

## Review Notes
- The `quantile()` function in ClickHouse produces non-deterministic results due to reservoir sampling. The post doesn't mention this, which could surprise users who get slightly different results on repeated runs. A future enhancement could note this behavior.
- ClickHouse also offers `quantileTDigest()` and `quantileGK()` (Greenwald-Khanna) as alternative approximate quantile functions with different accuracy/performance tradeoffs. These could be mentioned in a future revision for completeness.
- All other SQL syntax, function names, interval syntax, and array indexing (1-based) were verified as correct.
