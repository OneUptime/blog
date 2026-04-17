# Validation Summary: How to Use arrayCount() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse higher-order array functions (arrayCount, arrayFilter)
- Lambda expressions in ClickHouse SQL

## Sources Consulted
- ClickHouse official docs: Array Functions — https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official docs: arrayCount — https://clickhouse.com/docs/sql-reference/functions/array-functions#arrayCount

## Issues Found
1. **Incorrect return type.** The post stated that `arrayCount()` returns a scalar `UInt64`. According to the official ClickHouse documentation, the return type is `UInt32`. Corrected the text accordingly.
2. **Incorrect claim about non-lambda form working on string arrays.** The original post described `arrayCount(arr)` without a lambda as counting "elements that are not equal to the zero value for the array's type (`0` for numeric, empty string for strings, etc.)" and gave an example calling `arrayCount(['hello', '', 'world', ''])`. In ClickHouse, the no-lambda form requires a numeric array — calling it on a `Array(String)` raises an "Illegal type" error. Rewrote the description to clarify this and replaced the string example with a lambda-based form: `arrayCount(s -> s != '', ['hello', '', 'world', ''])`, which is the correct way to count non-empty strings.

## Review Notes
- All other code examples were verified against the documented behavior: the lambda-based counts (`x -> x > 5`, `s -> s >= 500`, etc.) produce the stated results.
- The multi-array lambda form `arrayCount((a, b) -> ..., arr1, arr2)` is supported by ClickHouse, as documented.
- The equivalence between `arrayCount(func, arr)` and `length(arrayFilter(func, arr))` and the memory-efficiency argument in favor of `arrayCount` are correct.
- Aggregation examples (`avg(arrayCount(...))`, `sum(arrayCount(...))`, usage in `HAVING`, etc.) are idiomatic ClickHouse.
- The `HAVING` example uses an alias (`total_slow_events`) defined in the `SELECT` clause — ClickHouse allows this, so the query is valid.
