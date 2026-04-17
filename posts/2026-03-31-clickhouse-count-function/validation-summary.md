# Validation Summary: How to Use count() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- Aggregate functions (count, countIf, uniq, uniqExact)
- MergeTree table engine

## Sources Consulted
- ClickHouse official docs — count() reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/count
- ClickHouse official docs — uniq(): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official docs — uniqExact(): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse official docs — combinators (`-If` suffix): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official docs — MergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **Incorrect equivalence claim for `count(DISTINCT col)`**: The post originally stated that `count(DISTINCT col)` "is equivalent to `uniq()` but uses an exact algorithm." This is wrong — `uniq()` is an approximate algorithm, not exact. By default, `count(DISTINCT col)` is equivalent to `uniqExact()` (controlled by the `count_distinct_implementation` setting). Fixed the sentence to correctly reference `uniqExact()` and mention the controlling setting.

## Review Notes
- The claim that `count()` is "marginally faster" than `count(*)` is a minor point; in practice ClickHouse's query planner typically compiles both to the same operation. The statement isn't wrong enough to require a fix, but readers should not expect measurable differences.
- The `EXPLAIN` example shows query plan output but does not use `EXPLAIN ESTIMATE` — that's fine since the surrounding prose only refers to inspecting the query, not to scan-size estimates specifically.
- `INTERVAL 7 DAY` syntax is valid in ClickHouse.
- All DDL, `GROUP BY`, `countIf`, and `uniq`/`uniqExact` usage examples are syntactically correct and idiomatic.
