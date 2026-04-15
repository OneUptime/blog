# Validation Summary: How to Use rankCorr() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate functions, MergeTree engine)
- SQL (DDL, DML, aggregate queries with GROUP BY)
- Spearman rank correlation (statistical concept)
- Pearson correlation (statistical concept, for comparison)

## Sources Consulted
- ClickHouse official documentation for `rankCorr()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/rankCorr
- ClickHouse official documentation for `corr()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corr
- ClickHouse SQL reference for CREATE TABLE, INSERT, and MergeTree engine

## Issues Found
1. **Incomplete interpretation table on the negative side**: The "Interpreting Rank Correlation Values" table was missing two rows that should mirror the positive side: "Moderate negative monotonic relationship" (-0.7 to -0.5) and "Very strong negative monotonic relationship" (-1.0 to -0.9). The original table jumped from "Weak negative" (-0.5 to -0.3) directly to "Strong negative" (-1.0 to -0.7), leaving a gap and merging what should be two distinct ranges. Fixed by adding the missing rows to make the table symmetric with the positive side.

## Review Notes
- The `rankCorr()` function formally accepts `Float*` parameter types per the official docs. The blog examples pass `UInt32` columns (e.g., `sales_rank`, `day_num`) directly to `rankCorr()`. In practice, ClickHouse performs implicit type conversion from integer to float for aggregate functions, so the examples work correctly. However, readers targeting strict type-checking environments may want to use explicit `toFloat64()` casts.
- The "Per-Category Correlation Analysis" section references a table `product_metrics_with_category` that is not created in the post. This is clearly a conceptual/pattern example rather than a runnable snippet, which is acceptable, but readers should understand it won't run against the sample data created earlier.
- The `corr()` function in ClickHouse is documented as using a numerically unstable algorithm. ClickHouse recommends `corrStable()` for better precision. The blog does not mention this, which is fine for the scope of the post (focused on `rankCorr()`), but could be a useful addition in the future.
