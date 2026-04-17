# Validation Summary: Common ClickHouse JOIN Mistakes and How to Fix Them

## Status
validated

## Post Type
Guide / Tips listicle

## Technologies Covered
- ClickHouse (SQL / JOIN engine)
- ClickHouse Distributed tables and GLOBAL JOIN
- ClickHouse Dictionaries (HASHED layout, `dictGet`)
- ClickHouse settings: `join_use_nulls`

## Sources Consulted
- ClickHouse JOIN clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse distributed subqueries and GLOBAL: https://clickhouse.com/docs/en/sql-reference/operators/in#distributed-subqueries
- ClickHouse setting `join_use_nulls`: https://clickhouse.com/docs/en/operations/settings/settings#join_use_nulls
- ClickHouse Dictionaries: https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse `dictGet` function: https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse CREATE DICTIONARY syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary

## Issues Found
No technical issues found.

All five mistakes accurately reflect documented ClickHouse behavior:
1. The default hash JOIN algorithm loads the right-side table into memory — putting the large table on the right side is a well-known OOM cause.
2. Without `GLOBAL`, the right-side subquery of a JOIN is re-executed on every shard when the right side is a distributed/remote table, causing N² fan-out. `GLOBAL JOIN` / `GLOBAL IN` correctly evaluate the right side on the initiator and broadcast it.
3. By default ClickHouse fills unmatched outer-join rows with type defaults (0, empty string) rather than NULL; `join_use_nulls = 1` switches this to SQL-standard NULL semantics.
4. Integer key joins avoid hashing long strings and are substantially faster.
5. The `CREATE DICTIONARY ... SOURCE(CLICKHOUSE(...)) LAYOUT(HASHED()) LIFETIME(...)` syntax and `dictGet('dict_name', 'attr', toUInt64(key))` usage are correct.

## Review Notes
- Recent ClickHouse versions (24.x+) expose additional JOIN algorithms (`parallel_hash`, `grace_hash`, `full_sorting_merge`, `partial_merge`) selectable via the `join_algorithm` setting. For very large right-side tables, `grace_hash` or `full_sorting_merge` can be preferable to the default `hash` algorithm. The post does not mention these alternatives, but its advice remains valid under default settings.
- The `join_use_nulls = 1` setting converts non-nullable column types on the right side to Nullable for unmatched rows, which has a small memory/perf cost — worth mentioning in a future revision but not an error.
- The dictionary `LIFETIME(300)` is a single-value lifetime; a range `LIFETIME(MIN 300 MAX 600)` is often recommended to stagger refreshes across replicas. Not an error, just a stylistic nit.
