# Validation Summary: How to Use minMap() and maxMap() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (aggregate functions: minMap, maxMap, sumMap)
- SQL (GROUP BY, ARRAY JOIN, AggregatingMergeTree)

## Sources Consulted
- ClickHouse official docs — minMap (minMappedArrays): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/minmap
- ClickHouse official docs — maxMap (maxMappedArrays): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/maxmap
- ClickHouse official docs — sumMap (sumMappedArrays): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/summap
- ClickHouse official docs — Aggregate function combinators (-Map combinator): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official docs — Aggregate functions reference listing: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference

## Issues Found
- **Summary section — "count" vs "sum"**: The final paragraph stated "Use them alongside `sumMap()` in the same query to compute count, min, and max in a single pass over the data." The word "count" was incorrect — `sumMap()` computes sums, not counts. Changed to "sum, min, and max".

## Review Notes
- The post presents `minMap`/`maxMap` as a single function with three calling conventions (two-array, tuple, Map column). In reality, the array and tuple forms invoke the standalone `minMap`/`maxMap` aggregate functions (which return `Tuple(Array, Array)`), while the Map column form works via the `-Map` aggregate function combinator applied to `min`/`max` (which returns a `Map` type). This distinction is omitted for simplicity. The post's examples are correct in practice because the Map column example does not use `.1`/`.2` tuple accessors on the result.
- The return type description ("a tuple with keys sorted and deduplicated") is accurate for the array forms but not for the Map column form, where the return type is `Map`. This is a minor nuance that does not affect the correctness of the code examples shown.
- All SQL syntax, `.1`/`.2` tuple accessor patterns, `ARRAY JOIN` unnesting, `AggregateFunction` column type declaration, `-State`/-Merge combinator references, and `today() - N` date arithmetic are correct per ClickHouse documentation.
- The claim that value types must be numeric, date, or datetime is accurate for the standalone `minMap`/`maxMap` functions. The `-Map` combinator technically supports any type that the underlying aggregate function supports (e.g., `min` supports strings), but this edge case is unlikely to matter for typical usage.
