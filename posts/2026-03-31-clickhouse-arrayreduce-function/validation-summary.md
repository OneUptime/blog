# Validation Summary: How to Use arrayReduce() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- ClickHouse aggregate functions (sum, avg, max, min, count, stddevPop, varPop, median, quantile, groupUniqArray, argMax)
- ClickHouse array functions (arrayReduce, arrayMap, ARRAY JOIN)

## Sources Consulted
- ClickHouse arrayReduce / array functions docs: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse count() aggregate function: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- ClickHouse aggregate function combinators (sumForEach / -ForEach): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators

## Issues Found

1. **Incorrect count() with NULL example.** The post claimed `arrayReduce('count', [1, 2, 3, NULL, 5])` returns 5, asserting that count "does not skip NULLs here." This is wrong — ClickHouse `count(x)` skips NULL values, so the correct result is 4. Fixed the result and the explanatory comment.

2. **Misleading sumForEach reference.** The intro to the dot-product section described the technique as "`sumForEach` via `arrayReduce` on element-wise products." `sumForEach` is the `-ForEach` combinator that aggregates arrays positionally across rows; it is unrelated to the `arrayReduce('sum', arrayMap(...))` technique actually shown. Reworded the sentence to accurately describe the `arrayMap` + `arrayReduce('sum', ...)` composition used in the example.

3. **Misleading argMax "most frequent element" example.** The example used `arrayReduce('argMax', ['a','b','a','c','a'], [1,1,1,1,1])` with the comment "Most frequent element (argMax trick)." With all weights equal to 1, `argMax` does not return the most frequent element — it returns an arbitrary value at the (tied) maximum. Replaced with weights `[1, 2, 1, 3, 1]` so the example actually demonstrates argMax semantics correctly (returning `'c'` at the position of the max weight 3) and rewrote the comment to describe what argMax actually does.

## Review Notes

- Verified arithmetic results: `stddevPop` and `varPop` of `[2,4,4,4,5,5,7,9]` are 2.0 and 4.0; `median` of `[1..10]` is 5.5; dot product `0.8*1.5 + 0.6*2.0 + 0.9*1.0 + 0.7*0.5 = 3.65` — all correct.
- Function signature, parametric aggregate syntax (`'quantile(0.5)'`), multi-array form, and `Array(Float64)` / `Array(Float32)` column types all match official ClickHouse semantics.
- The `groupUniqArray` example correctly notes that result order may vary, which is accurate for this aggregate.
- The ARRAY JOIN equivalence section is accurate; both forms produce the same per-row aggregation result.
