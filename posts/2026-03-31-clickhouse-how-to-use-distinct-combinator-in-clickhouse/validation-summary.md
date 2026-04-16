# Validation Summary: How to Use -Distinct Combinator in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse aggregate function combinators (-Distinct, -If)
- ClickHouse aggregate functions (count, sum, avg, min, max, uniq, uniqExact, uniqExactIf)
- SQL DISTINCT semantics

## Sources Consulted
- ClickHouse Aggregate Function Combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs source (combinators.md): https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/aggregate-functions/combinators.md
- ClickHouse PR #10930 ("Add -Distinct combinator for aggregate functions"): https://github.com/ClickHouse/ClickHouse/pull/10930
- ClickHouse issue #11517 (countIf(DISTINCT ...) feature discussion): https://github.com/ClickHouse/ClickHouse/issues/11517
- ClickHouse count() docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- Altinity KB on uniq functions: https://kb.altinity.com/altinity-kb-schema-design/uniq-functions/

## Issues Found
1. **Incorrect equivalence claim in "Combining -Distinct with -If" section.** The post claimed that `countDistinctIf(user_id, country = 'US')` is equivalent to `uniqIf(user_id, country = 'US')`. This is wrong because `countDistinct`/`uniqExact` produce exact counts while `uniq` is approximate (uses HyperLogLog-family sampling with ~1% error). The post itself states this distinction in the "-Distinct vs uniq() and uniqExact()" section. The correct exact equivalent is `uniqExactIf`. Fixed by replacing `uniqIf` with `uniqExactIf` in both occurrences of the example.

## Review Notes
- The `-Distinct` combinator was added to ClickHouse in PR #10930 (2020) and remains supported. It can be appended to aggregate function names or written as `<fn>(DISTINCT <expr>)`.
- `countDistinct` is resolved via the `count_distinct_implementation` setting (default `uniqExact`), so the claim that `countDistinct(x)` is equivalent to `uniqExact(x)` is accurate for default settings.
- `minDistinct` and `maxDistinct` are technically valid (the combinator works with any aggregate function) but semantically redundant — `min`/`max` of a set equals `min`/`max` of its distinct values. The post uses them only as syntactic examples of the combinator pattern, which is acceptable, but readers should be aware they provide no practical benefit over plain `min`/`max`.
- The post's hedge "You can combine `-Distinct` and `-If` in some versions" is appropriate — combinator stacking behavior has evolved across ClickHouse versions, and `uniqExactIf` is the widely-recommended canonical function for this use case (as noted in issue #11517).
- All DDL (CREATE TABLE with MergeTree, LowCardinality), the WITH CTE, and the settings `max_bytes_before_external_group_by` and `group_by_overflow_mode = 'any'` are valid ClickHouse syntax.
