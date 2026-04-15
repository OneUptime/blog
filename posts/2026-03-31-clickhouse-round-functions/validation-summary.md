# Validation Summary: How to Use round() and roundToExp2() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse `round()` function
- ClickHouse `roundToExp2()` function
- ClickHouse aggregate functions (`avg`, `quantile`, `max`, `sum`)
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation — Rounding Functions: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions
- ClickHouse official documentation — round(): https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#round
- ClickHouse official documentation — roundToExp2(): https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions#roundtoexp2

## Issues Found

### Issue 1: Incorrect rounding mode for Float types (multiple locations)
- **What was wrong:** The post stated that `round()` uses "half-away-from-zero" rounding in the function signature comment, the Basic round() Usage section introduction, the explanation of example results, and the Summary section. ClickHouse actually uses **banker's rounding** (round half to even) for Float32/Float64 types. Half-away-from-zero only applies to Decimal and integer types.
- **What was changed:** Updated the function signature comment, section intro, example explanation, and Summary to correctly describe banker's rounding for Float types, and noted the distinction between Float and Decimal/integer behavior. Added a clarifying note that `round(2.5)` returns 2 (not 3) under banker's rounding, to prevent reader confusion.
- **Why:** This is a significant technical error. A reader following the "half-away-from-zero" rule would expect `round(2.5)` to return 3, but ClickHouse returns 2 for Float inputs. This is a common source of bugs when migrating from databases like MySQL or PostgreSQL.

### Issue 2: Misleading column alias `p50_approx` for `avg()`
- **What was wrong:** In the "Combining round() with Aggregates" section, `round(avg(latency_ms), 1)` was aliased as `p50_approx`. The average (mean) is not an approximation of the 50th percentile (median). These are fundamentally different statistics, especially for skewed distributions like latency.
- **What was changed:** Renamed the alias from `p50_approx` to `avg_latency`.
- **Why:** Using `p50_approx` for a mean calculation is semantically incorrect and could mislead readers into thinking `avg()` approximates the median. ClickHouse provides `median()` and `quantile(0.5)()` for actual p50 calculations.

## Review Notes
- The `roundToExp2()` examples and explanations are all correct. The claimed outputs (1, 2, 4, 8, 64, 512) are accurate.
- The negative precision examples (`round(1537, -1)` = 1540, `round(1537, -2)` = 1500, `round(1537, -3)` = 2000) are correct. None of these are tie-breaking cases, so the rounding mode distinction does not affect the results.
- All SQL syntax is valid ClickHouse SQL, including the parametric aggregate function syntax `quantile(0.95)(latency_ms)`.
- The `arrayJoin()` usage in the File Size Representation section is correct.
- For currency calculations, the post uses `Float64` columns. In production, `Decimal` types would be more appropriate for financial data to avoid floating-point precision issues. This is a design choice rather than a technical error, but worth noting for readers.
