# Validation Summary: How to Use arraySum() and arrayAvg() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- ClickHouse array functions: `arraySum`, `arrayAvg`, `arrayMap`, `arrayFilter`, `length`
- Scalar aggregates: `sum`, `avg`, `pow`

## Sources Consulted
- ClickHouse Array Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse `arraySum` reference: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraysum
- ClickHouse `arrayAvg` reference: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayavg
- ClickHouse higher-order functions / lambda syntax for `arrayMap` and `arrayFilter`

## Issues Found
- **arraySum() return type claim was inaccurate.** The post originally stated: "The return type matches the element type for integer arrays and returns a Float64 for floating-point inputs." In reality, ClickHouse widens integer results to `Int64`/`UInt64` (not matching the element type) to prevent overflow. I updated the sentence to: "For integer arrays the return type is widened to `Int64` or `UInt64` to prevent overflow; floating-point arrays return `Float64`, and `Decimal` arrays return a `Decimal` of sufficient precision."

## Review Notes
- All SQL examples are syntactically valid: multi-argument lambdas in `arrayMap` (e.g., `(w, v) -> w * v`), boolean lambdas with `AND` in `arrayFilter`, and nesting of higher-order functions (e.g., variance computation) are all supported by ClickHouse.
- The computed numeric results (`arraySum([1,2,3,4,5]) = 15`, `arrayAvg([10,20,30,40,50]) = 30`, `arrayAvg([1.2, 3.4, 5.6]) = 3.4`, `arraySum([1.5, 2.5, 3.0]) = 7`) are correct. Note: ClickHouse's default TSV output typically prints whole-valued `Float64` as `7` rather than `7.0`; the `7.0`/`30.0` notation in the post is for clarity but is format-dependent. Left as-is since it communicates the Float64 return type to the reader.
- The inline variance example re-evaluates `arrayAvg(span_durations_ms)` for every element in the inner lambda. This is semantically correct but not optimal; a CTE or subexpression alias would hoist the mean. Left as-is since the post is demonstrating composition, not optimization.
- The claim that `arrayAvg()` "always returns a Float64 regardless of the input type" aligns with the documented return type and is accurate for the common Int/Float cases shown in the post.
