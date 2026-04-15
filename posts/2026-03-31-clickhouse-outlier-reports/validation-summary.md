# Validation Summary: How to Generate Outlier Reports in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- Statistical outlier detection: Z-score, IQR (Interquartile Range), MAD (Median Absolute Deviation)
- ClickHouse aggregate functions: `avg`, `stddevPop`, `quantile`, `median`, `multiIf`, `nullIf`
- ClickHouse window functions

## Sources Consulted
- ClickHouse `median` function docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/median
- ClickHouse `stddevPop` function docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stddevpop
- ClickHouse `quantile` function docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse window functions docs: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse conditional functions (`multiIf`) docs: https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- ClickHouse nullable functions (`nullIf`) docs: https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse JOIN clause docs: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse WITH clause (CTEs) docs: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- Iglewicz, B. & Hoaglin, D.C. (1993), "Volume 16: How to Detect and Handle Outliers" — defines the modified Z-score formula with the 0.6745 constant

## Issues Found
- **MAD modified Z-score formula missing 0.6745 constant**: The Median Absolute Deviation section computed `abs(x - median) / MAD` and labeled it `modified_z_score` with a threshold of 3.5. The standard Iglewicz & Hoaglin modified Z-score formula is `0.6745 * abs(x - median) / MAD`, where 0.6745 is the 75th percentile of the standard normal distribution. This constant makes MAD a consistent estimator of the standard deviation for normally distributed data. Without it, the 3.5 threshold was effectively equivalent to ~2.36 standard deviations rather than the intended ~3.5, which would flag significantly more data points as outliers than intended. **Fixed** by adding the `0.6745` multiplier to both the SELECT expression and the WHERE clause.

## Review Notes
- The Z-score method (first example) does not protect against division by zero when `stddevPop` returns 0 (all values identical), unlike the per-user and MAD examples which use `nullIf`. In ClickHouse, Float64 division by zero returns `inf` per IEEE 754 rather than raising an error, so this would produce `inf` z-scores rather than failing. This is a minor robustness concern but not a correctness error.
- The `median()` function in ClickHouse is an alias for `quantile(0.5)`, which uses an approximate algorithm. For exact results, `medianExact()` could be used instead, though the approximate version is appropriate for the large-scale use cases described in the post.
- All ClickHouse SQL syntax, function names, and query patterns were verified as correct against current official documentation.
