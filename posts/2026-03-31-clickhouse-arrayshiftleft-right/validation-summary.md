# Validation Summary: How to Use arrayShiftLeft() and arrayShiftRight() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse array functions: `arrayShiftLeft`, `arrayShiftRight`, `arrayRotateLeft`, `arrayRotateRight`, `arrayMap`, `arrayDifference`

## Sources Consulted
- [ClickHouse Array Functions documentation](https://clickhouse.com/docs/sql-reference/functions/array-functions)
- [ClickHouse PR #53557 — Added functions array{Rotate,Shift}{Left,Right}](https://github.com/ClickHouse/ClickHouse/pull/53557)
- [ClickHouse Issue #52895 — arrayShiftLeft, arrayShiftRight](https://github.com/ClickHouse/ClickHouse/issues/52895)

## Issues Found
1. **Incorrect claim that `n` must be non-negative.**
   - The post stated: `` `n` must be non-negative. ``
   - Per the official ClickHouse documentation, both `arrayShiftLeft` and `arrayShiftRight` accept negative `n`, which reverses the shift direction (so `arrayShiftLeft(arr, -n)` behaves like `arrayShiftRight(arr, n)` and vice versa).
   - **Fix applied:** Replaced the incorrect constraint with an accurate description of negative `n` behavior and clarified that the "fully shifted" edge case kicks in when `|n|` is greater than or equal to the array length.

## Review Notes
- The function signatures, default-value fill behavior, basic-usage results, and the fully-shifted-out example output were verified against the official docs and are accurate.
- The element-wise lag example is correct: with 1-based ClickHouse array indexing, `arrayShiftRight(readings, 1)` yields a lagged array whose first element is the element-type default (0 for numerics), so the first `delta` is indeed `readings[1] - 0`.
- The manual diff example produces the same output as `arrayDifference` for the given input (`[0, 3, -2, 7, -3]`) — verified by hand.
- Minor caveat (not corrected, since the example is illustrative): the padding example uses `toFloat64(NULL)` as the fill default. This only works cleanly when `last_n_scores` is `Array(Nullable(Float64))`; for a non-nullable `Array(Float64)` column, the default argument type would need to match the element type (non-nullable). Readers applying this pattern should ensure their column is nullable or choose a non-NULL sentinel fill.
