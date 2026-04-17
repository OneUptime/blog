# Validation Summary: How to Choose the Right ORDER BY Key in ClickHouse

## Status
validated

## Post Type
Guide / Best practices tutorial

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ORDER BY / Primary key indexing
- Projections (ALTER TABLE ... ADD PROJECTION / MATERIALIZE PROJECTION)
- LowCardinality, DateTime, UInt64, Decimal64 data types
- system.columns system table

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ALTER PROJECTION docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse system.columns docs: https://clickhouse.com/docs/en/operations/system-tables/columns

## Issues Found
No technical issues found.

Verified items:
- Default `index_granularity` of 8192 rows per mark is correct.
- The statement that the primary index defaults to the ORDER BY columns is accurate (PRIMARY KEY can be a prefix of ORDER BY; if not specified, it equals ORDER BY).
- `MergeTree()` engine declaration with `LowCardinality(String)`, `DateTime`, `UInt64`, `Decimal64(2)` types are valid.
- Compound ORDER BY ordering (low-cardinality first, high-cardinality later) matches official ClickHouse guidance.
- Use of expressions (e.g. `toStartOfHour(event_time)`) in ORDER BY is supported syntax.
- `system.columns` table contains both `data_compressed_bytes` and `data_uncompressed_bytes` — query is valid.
- Projection syntax `ALTER TABLE ... ADD PROJECTION name (SELECT * ORDER BY ...)` and `ALTER TABLE ... MATERIALIZE PROJECTION name` matches the documented forms; the docs even include a `SELECT * ORDER BY user_name` example.

## Review Notes
- The query against `system.columns` uses `sum()` and `GROUP BY column`, which are functionally redundant since `system.columns` already has one row per (table, column). The query still executes correctly. For per-part granularity, `system.parts_columns` would be more granular, but this is a stylistic note, not a correctness issue.
- The heading "Put High-Cardinality Equality Filters Last" frames the rule slightly loosely — the underlying body text correctly conveys the standard guidance (low-cardinality columns first, high-cardinality columns later). No change needed.
