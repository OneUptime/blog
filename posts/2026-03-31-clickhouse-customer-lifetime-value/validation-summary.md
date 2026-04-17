# Validation Summary: How to Calculate Customer Lifetime Value with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- Aggregate functions (`count`, `sum`, `min`, `max`, `uniq`, `sumIf`)
- Date functions (`dateDiff`, `toYYYYMM`, `toDate`, `now`)
- Null handling (`nullIf`)
- Subqueries and `JOIN ... USING` syntax
- CASE expressions for customer segmentation

## Sources Consulted
- ClickHouse aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `dateDiff`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse `sumIf` / combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `toYYYYMM`: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#toyyyymm
- ClickHouse `nullIf`: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#nullif
- ClickHouse JOIN (USING clause): https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse regression functions (for terminology comparison): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/simplelinearregression

## Issues Found
1. **Mislabeled section "Predictive CLV with Linear Regression"** — The SQL query in that section does not actually perform linear regression (which would fit a line to data points via least squares, e.g. using ClickHouse's `simpleLinearRegression` or `stochasticLinearRegression`). Instead it annualizes observed per-day revenue (`total_revenue / customer_age_days * 365`), which is simple linear extrapolation. Changed the section heading from "Predictive CLV with Linear Regression" to "Predictive CLV with Linear Extrapolation" to accurately describe the technique.
2. **Description mentioned "linear regression extrapolation"** — Updated to "linear extrapolation" to match the corrected section heading and the actual technique used.

## Review Notes
- All SQL queries use valid ClickHouse syntax and functions (`count()`, `sum()`, `sumIf()`, `uniq()`, `dateDiff()`, `toYYYYMM()`, `nullIf()`, `round()`, `JOIN ... USING`).
- The `HAVING customer_age_days > 30` clause in the predictive CLV subquery correctly references the aliased aggregate expression; ClickHouse supports SELECT-alias references in HAVING.
- The `first_order` subquery in the "CLV at N Months" section does not filter by `status = 'completed'`, meaning the first-order timestamp may include canceled orders. This is a reasonable design choice (the cohort is defined by when a customer first engaged) but readers may wish to adjust based on their business definition. Left as-is since it is not a correctness error.
- `count(DISTINCT customer_id)` is exact; for very large datasets users may prefer `uniq(customer_id)` for performance. Not flagged as an error.
- The predictive CLV query assumes revenue rate is constant over time — a well-known limitation of naive CLV extrapolation, but the author's summary acknowledges this is a "simple" approach, which is accurate.
