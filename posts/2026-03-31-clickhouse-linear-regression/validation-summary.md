# Validation Summary: How to Perform Linear Regression in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate functions, SQL syntax)
- `simpleLinearRegression` aggregate function
- `stochasticLinearRegression` aggregate function
- Linear regression / ordinary least squares
- Stochastic gradient descent regression

## Sources Consulted
- ClickHouse official documentation for `simpleLinearRegression`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/simplelinearregression
- ClickHouse official documentation for `stochasticLinearRegression`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/stochasticlinearregression
- ClickHouse source code (`AggregateFunctionSimpleLinearRegression.cpp`): https://github.com/ClickHouse/ClickHouse/blob/master/src/AggregateFunctions/AggregateFunctionSimpleLinearRegression.cpp

## Issues Found

1. **Tuple return order was reversed throughout the post.** The blog stated `simpleLinearRegression` returns `(intercept, slope)`, but it actually returns `(k, b)` where `k` = slope (first element) and `b` = intercept (second element). This was confirmed by both official docs and source code. Fixed the description and swapped the `reg.1`/`reg.2` labels in the "Extracting Coefficients" example.

2. **All prediction formulas were wrong due to the swapped tuple order.** The blog used `reg.1 + reg.2 * x` (treating `.1` as intercept and `.2` as slope), but the correct formula is `reg.2 + reg.1 * x` (intercept + slope * x). Fixed in three locations: the "Making Predictions" example, the R-squared computation, and the "Forecasting Request Volume" example.

3. **R-squared query had a nested aggregate bug.** The original query used `avg(y) AS mean_y` as a WITH expression alias, which would expand `mean_y` to `avg(y)` inside the `sum(pow(y - mean_y, 2))` expression — creating an illegal nested aggregate (`sum(... avg(y) ...)`). Fixed by converting it to a scalar subquery: `(SELECT avg(y) FROM regression_data) AS mean_y`.

## Review Notes
- The `stochasticLinearRegression` example is syntactically correct and uses valid parameters and argument order (target first, then features). However, the post does not explain the return value (an array of weights with bias as the last element) or demonstrate how to use the `-State` combinator with `evalMLMethod` for making predictions — which is the standard ClickHouse pattern for SGD-based regression. This could be a future improvement.
- The `stochasticLinearRegression` call without the `-State` combinator returns raw weight arrays, which is less practical for most users than the `stochasticLinearRegressionState` + `evalMLMethod` pattern shown in the official docs.
