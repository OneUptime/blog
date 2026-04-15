# Validation Summary: How to Use mapFilter() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse Map data type and higher-order map functions (`mapFilter`, `mapApply`, `mapKeys`, `mapValues`)
- Lambda expressions in ClickHouse SQL
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation — Tuple Map Functions: https://clickhouse.com/docs/sql-reference/functions/tuple-map-functions
- ClickHouse official documentation — Operators: https://clickhouse.com/docs/sql-reference/operators

## Issues Found
1. **Incorrect `mapApply()` lambda syntax** (Section: "Combining mapFilter with mapApply")
   - **What was wrong:** The lambda passed to `mapApply()` returned a single scalar value: `mapApply((k, v) -> round(v, 1), metrics)`. According to the official documentation, `mapApply()` requires the lambda to return a **tuple** of `(new_key, new_value)`. Returning a single value would cause a runtime error.
   - **What was changed:** Corrected to `mapApply((k, v) -> (k, round(v, 1)), metrics)`, which properly returns a tuple preserving the original key and rounding the value.
   - **Why:** The official docs show the required pattern: `mapApply((k, v) -> (k, v * 2), map('k1', 1, 'k2', 2))`. The lambda must always produce a two-element tuple so ClickHouse can construct the resulting Map.

## Review Notes
- The use of `length()` on a Map result in the "Identifying Critical Threshold Breaches" section is not explicitly documented in the official Map functions reference. However, this is known to work in practice because ClickHouse's `length()` function is overloaded to handle Map types. An alternative would be `length(mapKeys(...))` if compatibility with older versions is a concern.
- All other code examples (`mapFilter` with string maps, numeric maps, key prefix filtering, empty-string removal) are syntactically correct and consistent with the documented function signatures.
- Table definitions using `Map(String, String)` and `Map(String, Float64)` with MergeTree engine are correct.
- The `BETWEEN` operator inside lambda expressions works as expected in ClickHouse.
