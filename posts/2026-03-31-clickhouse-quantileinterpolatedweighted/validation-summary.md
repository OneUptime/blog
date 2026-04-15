# Validation Summary: How to Use quantileInterpolatedWeighted() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Aggregate functions: `quantileInterpolatedWeighted()`, `quantilesInterpolatedWeighted()`, `quantileExactWeighted()`

## Sources Consulted
- ClickHouse official documentation for `quantileInterpolatedWeighted`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileinterpolatedweighted
- ClickHouse official documentation for `quantileExactWeightedInterpolated`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileExactWeightedInterpolated
- ClickHouse source code (`AggregateFunctionQuantileInterpolatedWeighted.cpp`) for implementation details

## Issues Found

1. **Invalid SQL in comparison example (lines 43-52):** Two separate SELECT statements shared a single FROM clause, which is not valid SQL. Fixed by combining them into a single SELECT with both function calls as columns.

2. **Misleading accuracy claim in introduction:** The phrase "often more statistically accurate result" overstated the function's precision. ClickHouse documentation actually recommends the newer `quantileExactWeightedInterpolated()` as more accurate than `quantileInterpolatedWeighted()`. In official examples, `quantileInterpolatedWeighted(0.99)` returned 8 (a boundary value) while `quantileExactWeightedInterpolated(0.99)` returned the correct interpolated value of 7.92. Removed the unsupported accuracy claim.

3. **Misleading accuracy claim in summary:** The summary stated the function is "more statistically accurate than `quantileExactWeighted()` at quantile boundaries," which is not supported by the documentation. Replaced with a note about the newer `quantileExactWeightedInterpolated()` function as a more precise alternative, and added the UInt weight type requirement.

4. **Minor wording fix:** Changed "closest observed value" to "one of the observed values" when describing `quantileExactWeighted()`, since it returns the value at the exact quantile rank in the weighted distribution, not necessarily the "closest" value.

## Review Notes
- The weight column must be an unsigned integer type (UInt8/16/32/64). The post did not originally mention this; it was added to the summary section.
- For integer-typed value columns, the interpolation result is truncated back to an integer, which can limit the interpolation benefit. This is a known implementation detail not covered in the post.
- ClickHouse introduced `quantileExactWeightedInterpolated()` in v24.10.0 as a recommended replacement with better accuracy. A mention of this was added to the summary section.
- The `quantileInterpolatedWeighted()` function silently skips NaN values — not mentioned in the post, but this is standard ClickHouse behavior for numeric aggregates.
- When computing multiple quantile levels, using the plural `quantilesInterpolatedWeighted()` form is more efficient than multiple individual calls, as the blog correctly demonstrates.
