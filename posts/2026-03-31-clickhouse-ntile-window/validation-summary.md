# Validation Summary: How to Use NTILE() Window Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL window functions (NTILE, quantileExact)
- Analytical SQL patterns (quartiles, deciles, quintiles, percentile bucketing)

## Sources Consulted
- ClickHouse official documentation — Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse official documentation — quantileExact: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexact

## Issues Found

1. **Incorrect terminology: "equal-width bucketing" in introduction** — The intro described NTILE as performing "equal-width bucketing." NTILE performs equal-count (equal-frequency) bucketing, not equal-width (equal value range) bucketing. The post itself correctly explained this distinction later in the "Comparing NTILE() with Explicit Percentile Thresholds" section, but the intro used the wrong term. Changed "equal-width" to "equal-count."

2. **Missing required frame specification for NTILE()** — The ClickHouse documentation explicitly requires `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` in the window specification for `ntile()`. All NTILE examples in the post omitted this required frame clause. Added the frame specification to the syntax block and all eight NTILE() OVER clauses across the code examples. Also added a note in the prose explaining this ClickHouse-specific requirement.

3. **Misleading comment in threshold-based example** — The SQL comment read "Threshold-based: equal value range per bucket," which is incorrect. Using `quantileExact` to set thresholds at the 25th, 50th, and 75th percentiles does not produce equal value ranges — the value ranges between thresholds depend on the data distribution. Changed the comment to "Threshold-based: buckets defined by percentile value boundaries."

## Review Notes
- The bucket assignment example (10 rows, NTILE(4)) is mathematically correct: 10 / 4 = 2 remainder 2, so buckets 1–2 get 3 rows each and buckets 3–4 get 2 rows each.
- The use of `quantileExact` as a window aggregate function (with OVER clause) is valid — ClickHouse documentation states all aggregate functions are supported as window functions.
- The "Identifying Top and Bottom Performers" example repeats the NTILE(5) OVER clause three times in the same SELECT. While this works, a subquery or CTE approach would be cleaner and avoid redundant window function evaluation. This is a style observation, not a correctness issue, so no change was made.
- All uses of `today()`, `today() - 1`, `COUNT()`, and other ClickHouse functions are syntactically correct.
