# Validation Summary: How to Use boundingRatio() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide for a ClickHouse aggregate function

## Technologies Covered
- ClickHouse (SQL aggregate functions)
- `boundingRatio()` aggregate function
- `simpleLinearRegression()` aggregate function (comparison)
- ClickHouse window functions
- ClickHouse date/time functions (`toUnixTimestamp`, `dateDiff`, `toDateTime`)
- `MergeTree` table engine
- `numbers()` table function

## Sources Consulted
- ClickHouse official documentation: [boundingRatio aggregate function](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/boundingRatio)
- ClickHouse documentation: [simpleLinearRegression](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/simplelinearregression)
- ClickHouse source for `AggregateFunctionBoundingRatio` (algorithm: tracks leftmost-by-x and rightmost-by-x point, returns `(right.y - left.y) / (right.x - left.x)`)

## Issues Found

1. **Incorrect formula description (multiple places).** The post repeatedly described `boundingRatio` as computing `(max(y) - min(y)) / (max(x) - min(x))` — the slope of an axis-aligned bounding box. This is wrong: `boundingRatio` actually computes the slope of the line connecting the leftmost (minimum x) and rightmost (maximum x) points, i.e. `(y_at_max_x - y_at_min_x) / (max(x) - min(x))`. The bounding-box version is always non-negative, which directly contradicts the post's own example showing a `-1.0` result. Fixed in the intro paragraph, the syntax-section return-value note, the Summary section, and the comparison-with-simpleLinearRegression paragraph.

2. **Wrong sample output values.** The "Practical Table" query results were listed as `auth | 0.00417` and `payment | -0.00556`. With x in Unix timestamp seconds and a 3-hour span (10800 seconds), the correct values are `15/10800 ≈ 0.00139` for auth and `-20/10800 ≈ -0.00185` for payment. Updated the result block accordingly.

3. **"Divide" vs "multiply" the slope by 3600.** The "Normalizing to Errors per Hour" section said "Divide the slope by 3600 to express it as change per hour." This is inverted — the slope is in units of (errors per second), so to convert to per-hour you multiply by 3600. Changed the wording.

4. **Window function inside aggregate with `GROUP BY`.** The first normalization example used `min(hour) OVER (PARTITION BY service)` inside a `boundingRatio(...)` aggregate at the same query level as `GROUP BY service`. ClickHouse forbids mixing window function output as aggregate-function input at the same level (the `hour` column is neither aggregated nor in the GROUP BY). Replaced this with the equivalent and simpler `boundingRatio(toUnixTimestamp(hour), errors) * 3600` pattern (same result mathematically, since multiplying the slope is equivalent to dividing the x-axis by the same factor).

## Review Notes

- The Basic Examples (`boundingRatio(number, number * 2)` → 2.0 and `boundingRatio(number, 10 - number)` → -1.0) are correct as written; both happen to produce the same result under either formula because the inputs are perfectly monotonic linear sequences.
- The hour-ordinal example using `dateDiff('hour', ...)` returning `5.0` and `-6.667` is correct.
- The Trend Classification, Comparing-with-simpleLinearRegression, Rolling Trend Windows, and Handling Edge Cases sections are syntactically valid ClickHouse SQL. `boundingRatio` is supported as a window function in modern ClickHouse versions.
- `simpleLinearRegression(...).1` correctly extracts the slope (`k`) from the returned `(k, b)` tuple.
- `isNaN()` is the correct ClickHouse function name for NaN-checking.
- The Trend Classification example uses `toDateTime('2024-01-01')` (without time component) while other sections use `toDateTime('2024-01-01 00:00:00')`. Both are valid and equivalent in ClickHouse; left as-is to preserve author style.
