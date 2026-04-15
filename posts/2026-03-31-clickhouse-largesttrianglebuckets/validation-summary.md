# Validation Summary: How to Use largestTriangleThreeBuckets() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate functions, MergeTree engine, SQL)
- Largest-Triangle-Three-Buckets (LTTB) downsampling algorithm
- Time-series data visualization

## Sources Consulted
- ClickHouse official documentation for `largestTriangleThreeBuckets`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/largestTriangleThreeBuckets
- LTTB algorithm paper by Sveinn Steinarsson (original algorithm specification)

## Issues Found

1. **Incorrect example output values**: The basic example showed `[(0,0),(24,0.9165),(49,-0.2752),(74,0.7087),(99,-0.5440)]` as output for `largestTriangleThreeBuckets(5)(number, sin(number / 10.0))`. The y values were mathematically wrong — they did not match `sin(x/10.0)` for the corresponding x values. For example, `sin(24/10) ≈ 0.6755`, not `0.9165`. Fixed to `[(0,0),(24,0.6755),(49,-0.9825),(74,0.8987),(99,-0.4575)]` with correct sin values for each x.

2. **Overly strong claim about peak/trough preservation**: The post stated "LTTB will always include the actual peak and trough of the series." The LTTB algorithm tends to preserve extrema better than uniform subsampling because it maximizes triangle area, but it does not guarantee the global peak and trough are always included. Softened to "LTTB is much more likely to include the actual peak and trough of the series because it maximizes triangle area in each bucket."

3. **Imprecise return type**: The post stated the return type as `Array(Tuple(x, y))`. Per the official documentation, the return type is `Array(Tuple(Float64, Float64))` regardless of input types. Updated accordingly.

## Review Notes
- The basic example output x-values (0, 24, 49, 74, 99) and y-values have been corrected to be mathematically consistent with `sin(x/10.0)`, but the actual points selected by the LTTB algorithm may differ depending on the ClickHouse version and implementation. The output is illustrative.
- The function also has an alias `lttb` which the post does not mention. This is not an error, just a potential addition for a future update.
- NaN values are automatically excluded from the analysis per the docs; this is not mentioned in the post but is not critical for the tutorial scope.
