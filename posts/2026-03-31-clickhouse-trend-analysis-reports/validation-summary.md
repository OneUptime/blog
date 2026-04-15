# Validation Summary: How to Build Trend Analysis Reports in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, window functions, aggregate functions)
- Time series analysis (moving averages, linear regression, growth rates, correlation)

## Sources Consulted
- ClickHouse documentation: row_number window function — https://clickhouse.com/docs/sql-reference/window-functions/row_number
- ClickHouse documentation: window functions overview — https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse documentation: simpleLinearRegression — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/simplelinearregression
- ClickHouse documentation: exponentialMovingAverage — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/exponentialMovingAverage
- ClickHouse documentation: corr aggregate function — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/corr
- ClickHouse documentation: type conversion functions — https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions

## Issues Found

### 1. EMA query used invalid `rowNumber()` function and illegal nested window functions
**What was wrong:** The EMA query used `rowNumber()` which is not a valid ClickHouse window function (should be `row_number()`). More critically, the query nested a window function call (`rowNumber() OVER (...)`) inside another window function (`sum(...) OVER (...)`), which is not supported in ClickHouse or standard SQL. The query would fail to execute.

**What was changed:** Replaced the broken query with a self-join approach that computes exponentially decayed weighted averages over a 10-day window. The self-join calculates `exp(-0.1 * days_difference)` as the decay weight, giving recent values higher influence.

**Why:** The original query was syntactically invalid and would produce an error. The self-join approach achieves the same conceptual goal with valid ClickHouse SQL.

### 2. Incorrect claim about no native EMA function
**What was wrong:** The text stated "ClickHouse does not have a native EMA function." ClickHouse provides `exponentialMovingAverage` as an aggregate function.

**What was changed:** Updated the text to acknowledge `exponentialMovingAverage` and position the self-join approach as an alternative for custom weighting.

**Why:** The original claim was factually incorrect.

### 3. Linear regression tuple destructuring syntax invalid
**What was wrong:** `simpleLinearRegression(toUnixTimestamp(day), value) AS (slope, intercept)` uses tuple destructuring syntax that ClickHouse does not support. Tuple elements must be accessed via `.1` and `.2` notation.

**What was changed:** Wrapped in a subquery and used `reg.1 AS slope_per_day` and `reg.2 AS intercept` to properly access the tuple elements.

**Why:** The `AS (name1, name2)` destructuring syntax is not valid ClickHouse SQL and would produce a parse error.

### 4. Linear regression slope was per-second, not per-day
**What was wrong:** `toUnixTimestamp(day)` converts a Date to seconds since epoch, making the regression slope represent change-per-second. The description says "rate per day."

**What was changed:** Replaced `toUnixTimestamp(day)` with `toUInt32(day)`, which converts a Date to its internal representation (days since epoch). This makes the slope directly represent change-per-day, matching the description.

**Why:** The unit mismatch between the description ("rate per day") and the actual computation (rate per second) would produce misleading results — the slope would be ~86,400x smaller than expected.

## Review Notes
- The `exponentialMovingAverage(halfLife)(value, time)` aggregate function could be demonstrated directly as a simpler alternative to the self-join approach, but that would require adding new content beyond the scope of error correction.
- The `lagInFrame` usage in the Week-over-Week section is correct but could alternatively use the simpler `lag` function for the same result.
- The `corr()` aggregate function usage is correct. ClickHouse also offers `corrStable()` for better numerical stability with large datasets.
