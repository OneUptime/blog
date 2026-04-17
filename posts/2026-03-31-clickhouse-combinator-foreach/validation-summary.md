# Validation Summary: How to Use the -ForEach Aggregate Combinator in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse aggregate function combinators (`-ForEach`)
- ClickHouse aggregate functions: `sum`, `avg`, `min`, `max`, `count`
- ClickHouse array functions (`arraySum`, `arrayMap`, `arrayZip`)
- MergeTree table engine
- `Array(T)` and `Array(Nullable(T))` data types

## Sources Consulted
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators (and `#-foreach` anchor)
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse `count` aggregate function documentation (NULL handling of `count(expr)`)

## Issues Found
1. **Incorrect claim about array length requirement (intro paragraph).**
   - Original text stated: "The input arrays must all have the same length within the group."
   - This contradicts the official ClickHouse documentation, whose own example (`sumForEach` of `[1, 2]`, `[3, 4, 5]`, `[6, 7]` → `[10, 13, 5]`) uses arrays of differing lengths. Arrays of different lengths are permitted; the output array length equals the longest input, and shorter arrays simply do not contribute at positions beyond their length.
   - Fix: softened the claim to describe the actual behavior for mismatched lengths while still recommending equal-length arrays for use cases where positions carry semantic meaning.

2. **Incorrect claim about output array length (Syntax section).**
   - Original text stated: "The output array has the same length as the input arrays."
   - Fixed to: the output array length equals the longest input array in the group (and equals that common length when all inputs share one).

All arithmetic in the worked examples (`sumForEach`, `avgForEach`, `minForEach`, `maxForEach`, `countForEach`, `arraySum(sumForEach(...))`) was recomputed by hand and matches the claimed outputs. The SQL syntax, `CREATE TABLE` / `INSERT` / `SELECT` / `GROUP BY` usage, `MergeTree` engine, `Array(UInt32)`, `Array(Float64)`, and `Array(Nullable(Float64))` type declarations are all valid ClickHouse syntax. `countForEach` on `Array(Nullable(Float64))` counting non-null elements at each position is consistent with `count(expr)` semantics (counts non-null values) combined with `-ForEach` positional aggregation.

## Review Notes
- The softer statement in the Summary section ("The input arrays within a group must all be the same length for results to be meaningful") is acceptable as practical guidance — it frames same-length arrays as a recommendation for semantic correctness rather than a hard requirement, which is accurate.
- `-ForEach` can be combined with many other combinators (e.g. `-If`, `-State`) to build richer pipelines (`sumForEachIf`, `avgForEachState`); the post intentionally stays scoped to the plain combinator and this is a reasonable editorial choice.
- The post uses plain-text result blocks rather than ClickHouse's actual formatted table output, which is fine for readability but means readers running the queries will see slightly different visual formatting (e.g. `12.333333333333334` instead of `12.333`). This is a minor cosmetic caveat, not a technical error.
- `avgForEach` returns `Float64` for all numeric inputs; the displayed rounded values (`12.333`, `11.666`, etc.) are truncations for presentation.
