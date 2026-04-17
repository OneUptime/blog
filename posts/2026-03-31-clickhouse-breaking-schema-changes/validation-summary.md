# Validation Summary: How to Handle Breaking Schema Changes in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, DDL, mutations, ALTER TABLE)
- MergeTree engine (ORDER BY, PARTITION BY)
- EXCHANGE TABLES (Atomic database engine)
- `system.mutations` system table
- ClickHouse type conversion functions (`toUUID`, `toFloat64OrZero`, `generateUUIDv4`)
- Python (feature flag snippet)

## Sources Consulted
- [ClickHouse ALTER column docs](https://clickhouse.com/docs/sql-reference/statements/alter/column)
- [ClickHouse EXCHANGE docs](https://clickhouse.com/docs/en/sql-reference/statements/exchange)
- [Altinity KB: How ALTERs work in ClickHouse](https://kb.altinity.com/altinity-kb-setup-and-maintenance/alters/)
- [Altinity KB: Atomic database engine](https://kb.altinity.com/engines/altinity-kb-atomic-database-engine/)
- [ClickHouse Atomic engine docs](https://clickhouse.com/docs/engines/database-engines/atomic)
- [ClickHouse GitHub PR #10727 (RENAME COLUMN for Distributed, 20.5)](https://github.com/ClickHouse/ClickHouse/pull/10727)

## Issues Found
- **Incorrect version for `RENAME COLUMN`**: The post stated "ClickHouse 21.4+ supports RENAME COLUMN". `ALTER TABLE ... RENAME COLUMN` was actually introduced in ClickHouse 20.4. Updated to "ClickHouse 20.4+".
- **Incorrect version for `EXCHANGE TABLES`**: The post stated "ClickHouse 20.6+". `EXCHANGE TABLES` was introduced with the Atomic database engine in ClickHouse 20.5 and only works on databases using the Atomic (or Shared) engine. Updated to "ClickHouse 20.5+, requires Atomic database engine" to capture both the correct version and the important engine prerequisite.

## Review Notes
- The `ALTER TABLE ... UPDATE ... WHERE 1` mutation syntax is valid. `WHERE 1` is accepted as an always-true predicate; `WHERE true` is slightly more idiomatic but both work.
- `toUUID(user_id)` in Phase 2 assumes every existing `user_id` is already a valid UUID string. In real migrations, `toUUIDOrNull` or `toUUIDOrDefault` would be safer to avoid mutation failures on malformed values, but this is a stylistic/robustness note rather than a technical error.
- When a column is added with `DEFAULT generateUUIDv4()`, existing rows read the computed default lazily until a `MATERIALIZE COLUMN` or mutation is issued. The `UPDATE` in Phase 2 effectively materializes it, so behavior is correct.
- Since ClickHouse 20.10, the `Atomic` database engine is the default, so `EXCHANGE TABLES` works out of the box for newly created databases. Readers on very old ClickHouse versions (pre-20.10) using the `Ordinary` engine would need to migrate the database first.
- The `system.mutations` columns referenced (`mutation_id`, `is_done`, `parts_to_do`) are correct and current.
- The shadow-table example uses `event_type AS event` in the copy step, which implies the original table has a column named `event_type`; readers should substitute their own column name — this is a harmless illustrative simplification.
