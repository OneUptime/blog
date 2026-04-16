# Validation Summary: How to Use JOINs in ClickHouse (INNER, LEFT, RIGHT, FULL)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- SQL JOIN operations (INNER, LEFT, RIGHT, FULL OUTER, CROSS, SEMI, ANTI)
- ClickHouse dictionaries (`dictGet`)
- ClickHouse distributed tables and `GLOBAL JOIN`
- ClickHouse join algorithms (`hash`, `partial_merge`, `grace_hash`)

## Sources Consulted
- ClickHouse official docs: SELECT ... JOIN clause — https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse settings reference: `join_algorithm` — https://clickhouse.com/docs/en/operations/settings/settings#join_algorithm
- ClickHouse settings reference: `grace_hash_join_initial_buckets` — https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse docs: Dictionary functions (`dictGet`) — https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse docs: Distributed table engine and GLOBAL IN/JOIN — https://clickhouse.com/docs/en/sql-reference/operators/in#distributed-subqueries
- ClickHouse docs: Conditional functions (`ifNull`, `COALESCE`, `countIf`) — https://clickhouse.com/docs/en/sql-reference/functions/

## Issues Found
No technical issues found.

All JOIN types listed (INNER, LEFT, RIGHT, FULL OUTER, CROSS, SEMI, ANTI) are supported by ClickHouse. The claim that the right-side table is loaded into memory in the default `hash` algorithm is accurate. The `join_algorithm` values (`hash`, `partial_merge`, `grace_hash`) and the `grace_hash_join_initial_buckets` setting are all valid. The `GLOBAL JOIN` semantics for distributed tables (broadcast of the right side from the coordinator) are correctly described. SEMI/ANTI JOIN syntax with the `LEFT` qualifier is valid ClickHouse syntax. Use of `ifNull`, `COALESCE`, `countIf`, `today()`, `concat`, `dictGet`, and CTEs via `WITH` is all syntactically correct.

## Review Notes
- ClickHouse also supports `ASOF JOIN` (time-series nearest-match join) which is not covered here; this is fine given the post's scope (standard SQL JOIN types).
- The recommendation to put the larger table on the LEFT matches ClickHouse's default behavior for the hash-based algorithms; note that since the `direct` and `full_sorting_merge` algorithms were introduced, the query planner may behave differently in some cases, but the guidance remains a good default.
- The implicit comma cross-join syntax works but is generally discouraged; the post already presents the explicit `CROSS JOIN` form first, which is good.
- `FULL OUTER JOIN` in ClickHouse historically had restrictions on join keys and has been expanded over recent versions; the simple equality on `date` shown here is fully supported.
