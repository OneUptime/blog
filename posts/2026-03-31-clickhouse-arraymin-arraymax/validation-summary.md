# Validation Summary: How to Use arrayMin() and arrayMax() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL array functions: `arrayMin`, `arrayMax`, `arrayMap`, `arrayReduce`, `indexOf`, `least`, `greatest`, `multiIf`

## Sources Consulted
- ClickHouse official array functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse documentation for `arrayMin` / `arrayMax` lambda semantics
- ClickHouse documentation for `indexOf` (1-based positions)

## Issues Found
- **Lambda return semantics in "Using Lambdas to Transform Before Comparing" were incorrect.** The post claimed that when a lambda is supplied, `arrayMin`/`arrayMax` return the *original (untransformed)* element. Per the ClickHouse documentation, these functions return the **min/max of the transformed (lambda-output) values**, and the return type matches the lambda's output type. I rewrote the section's intro and all three example results to reflect this:
  - `arrayMin(x -> abs(x), [-5, 3, -1, 4, -2])` → `1` (min of `abs()` results), not `-1`.
  - `arrayMin(x -> length(x), ['banana', 'fig', 'apple', 'kiwi'])` → `3` (length of `'fig'`), not `'fig'`.
  - `arrayMax(x -> length(x), ['banana', 'fig', 'apple', 'kiwi'])` → `6` (length of `'banana'`), not `'banana'`.

## Review Notes
- All other examples verified correct: basic numeric/float/string min/max, the `sensor_readings` `Memory` table, the filter/range queries, the element-wise pairwise pattern using `arrayMap` + `least`/`greatest`, the min-max normalization snippet, and the `indexOf` peak-position example (ClickHouse `indexOf` is 1-based, so positions 5/5/4/4 are correct for the given data).
- The note that `arrayReduce('min', arr)` is equivalent to `arrayMin(arr)` is accurate.
- The function-signature snippet `arrayMin([func,] arr) -> T` is a reasonable simplification; technically `T` corresponds to the lambda's return type when `func` is provided, which the corrected lambda section now makes explicit.
