# Validation Summary: How to Use mapAdd() and mapSubtract() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `mapAdd()` and `mapSubtract()` tuple-map functions
- `sumMap()` aggregate function (via `-Map` combinator)
- `Map(K, V)` column type
- `map()` function for constructing Map literals

## Sources Consulted
- ClickHouse official docs — Tuple Map Functions (mapAdd, mapSubtract): https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse official docs — Aggregate Function Combinators (-Map): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found
- **Intro paragraph inaccuracy about `mapSubtract()` key handling**: The original text stated "Keys that exist in only one of the input maps are included in the result with their original value." This is correct for `mapAdd()` (since 0 + value = value), but incorrect for `mapSubtract()` when a key exists only in a subsequent (non-first) map — the result would be 0 - value = -value (negated), not the original value. Fixed the sentence to differentiate the two functions: keys unique to the first map keep their value, while keys unique to later maps appear negated.

## Review Notes
- All SQL code examples use correct syntax and would execute as described on modern ClickHouse versions (23.x+).
- `mapAdd()` and `mapSubtract()` correctly shown accepting `Map` type arguments (supported in current ClickHouse alongside the older `Tuple(Array, Array)` form).
- `sumMap()` correctly used with `Map(String, Int64)` columns via the `-Map` aggregate combinator.
- Table definitions, INSERT statements, CTEs, and scalar subquery patterns are all syntactically and semantically correct.
- The expected query results stated in the prose match the actual function behavior.
