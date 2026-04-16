# Validation Summary: How to Use the IN Operator Effectively in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- IN / NOT IN operators
- GLOBAL IN (distributed queries)
- ClickHouse array functions (`has`, `hasAny`)
- ClickHouse Dictionaries

## Sources Consulted
- ClickHouse IN operators documentation: https://clickhouse.com/docs/sql-reference/operators/in
- ClickHouse distributed subqueries (GLOBAL IN): https://clickhouse.com/docs/sql-reference/operators/in#distributed-subqueries
- ClickHouse `transform_null_in` setting: https://clickhouse.com/docs/operations/settings/settings#transform_null_in
- ClickHouse array functions (`has`, `hasAny`): https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse Dictionaries (layouts: flat, hashed): https://clickhouse.com/docs/sql-reference/dictionaries

## Issues Found
No technical issues found.

All claims verified against official documentation:
- `IN` returns `UInt8` (0/1) — correct (becomes `Nullable(UInt8)` when NULLs are involved).
- Subquery in `IN` runs once and is held in an in-memory set — correct per docs ("A subquery in the IN clause is always run just one time on a single server").
- `NOT IN` + NULL hides rows under default `transform_null_in = 0` — correct (matches standard SQL UNKNOWN semantics).
- `GLOBAL IN` runs the subquery on the initiator and ships the temporary table to remote shards — correct.
- `has(arr, elem)` and `hasAny(arr_x, arr_y)` syntax and semantics — correct.
- Dictionary O(1) lookup claim — correct in practice for `flat` (array index) and `hashed` (hash table) layouts.
- SQL syntax in all examples is valid ClickHouse SQL (`today()`, tuple literals, `GLOBAL IN`, JOIN with dictionary table form).

## Review Notes
- The dictionary JOIN example (`JOIN country_dict AS d ON o.country_code = d.code`) works against a dictionary, but ClickHouse also offers `dictGet('country_dict', 'country', tuple(country_code))` which is often more idiomatic and avoids treating the dictionary as a table. The post's approach is still valid.
- The "O(1)" claim for dictionaries is layout-dependent. It holds for `flat`, `hashed`, `complex_key_hashed`, and similar layouts, but `range_hashed` and `cache` have different characteristics. The post's recommendation context (large lookup table) implicitly assumes a hashed-style layout, which is the common default — no correction needed.
- `GLOBAL IN` ships the result set to every shard, which can become expensive if the inner subquery returns a very large result; worth noting in a future revision but not a correctness issue.
