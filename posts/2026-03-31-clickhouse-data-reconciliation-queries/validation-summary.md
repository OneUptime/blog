# Validation Summary: How to Build Data Reconciliation Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse system tables (`system.parts`)
- ClickHouse hash functions (`cityHash64`)
- ClickHouse table engines (`ReplacingMergeTree`)
- ClickHouse date/time functions (`toDate`, `today()`, `now()`)

## Sources Consulted
- ClickHouse SQL Reference — https://clickhouse.com/docs/en/sql-reference
- ClickHouse `system.parts` documentation — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse hash functions — https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse `ReplacingMergeTree` / `FINAL` — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse `formatReadableSize` — https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse SELECT / JOIN / USING — https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
No technical issues found.

## Review Notes
- The checksum approach using `sum(cityHash64(...))` is a common order-independent reconciliation pattern, but readers should be aware that summing 64-bit hashes is not collision-free — two different datasets could (in rare cases) produce the same sum. For stricter guarantees, `groupBitXor` or concatenated sorted hashing can be used. The post's phrasing ("the data is identical") is a slight simplification but acceptable for a practical reconciliation workflow.
- The `HAVING count > 1` syntax uses the alias of `count()` — this works in ClickHouse, though some readers may prefer `HAVING count() > 1` for clarity.
- In the Basic Count Reconciliation query, the inner subquery uses `WHERE date >= today() - 7` where `date` is defined as a `toDate(ts)` alias in the same SELECT; ClickHouse supports aliases in WHERE clauses, so this works, but it relies on the assumption that `etl_control_table` also has a compatible `ts` column. The query would benefit from a clarifying comment about expected table schema, though this is a stylistic note rather than a correctness issue.
- All `system.parts` column references (`partition`, `rows`, `bytes_on_disk`, `active`) are current and correct.
