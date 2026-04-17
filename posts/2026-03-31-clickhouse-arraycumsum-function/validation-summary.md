# Validation Summary: How to Use arrayCumSum() and arrayCumSumNonNegative() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide for ClickHouse array functions.

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse array functions: `arrayCumSum`, `arrayCumSumNonNegative`, `arrayFirstIndex`, `arrayExists`, `arrayMap`, `arraySum`, `arrayConcat`

## Sources Consulted
- Official ClickHouse array-functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- Official ClickHouse operators documentation: https://clickhouse.com/docs/en/sql-reference/operators
- Executed the examples in `clickhouse local` (built from master) to confirm return values and verify error behavior for scalar-array arithmetic.

## Issues Found
- **Scalar-array arithmetic in the "Computing Remaining Budget After Each Step" section.** The original example used `initial_budget - arrayCumSum(token_costs)`, where `initial_budget` is a scalar and `arrayCumSum(...)` returns an array. ClickHouse does not broadcast scalars across arrays for arithmetic operators - running this produces `Code: 43. DB::Exception: Illegal types UInt16 and Array(UInt64) of arguments of function minus`. Fixed by wrapping the subtraction in `arrayMap`: `arrayMap(c -> initial_budget - c, arrayCumSum(token_costs))`, which was verified to produce the expected element-wise result.

All other examples were executed against ClickHouse and produced the outputs shown in the post:
- `arrayCumSum([10, -3, 5, -8, 2]) = [10, 7, 12, 4, 6]` ✓
- `arrayCumSumNonNegative([10, -3, -15, 5, 2]) = [10, 7, 0, 5, 7]` ✓
- `arrayCumSum([5, -10, 3]) = [5, -5, -2]` and `arrayCumSumNonNegative([5, -10, 3]) = [5, 0, 3]` ✓
- `arrayFirstIndex`, `arrayExists`, `arrayMap`, `arraySum`, and `arrayConcat` are all used with correct signatures.

## Review Notes
- The function description of `arrayCumSumNonNegative` is slightly softened compared to the official docs ("resets the running total to 0" / "clamped to 0"); the official wording is "replacing any negative running sum with zero." The post's phrasing is accurate in effect - when the running sum would go negative, it is replaced by 0 and accumulation continues - so no change was needed.
- The CDF example relies on `/` between integers returning a floating-point result in ClickHouse, which it does (confirmed: `[0.1, 0.3, 0.6, 1]`). No change needed.
- The `arrayConcat([5, -10, 3], [])` call in the comparison example is a no-op but is valid and renders the intended output; left as-is to preserve the author's style.
