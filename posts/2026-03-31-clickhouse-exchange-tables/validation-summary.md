# Validation Summary: How to Use EXCHANGE TABLES in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL DDL (EXCHANGE TABLES, RENAME TABLE, CREATE TABLE ... AS, TRUNCATE, INSERT ... SELECT, DROP TABLE)
- ClickHouse system tables (system.tables)
- ClickHouse dictionaries (SYSTEM RELOAD DICTIONARY)
- ON CLUSTER distributed DDL

## Sources Consulted
- ClickHouse EXCHANGE statement docs: https://clickhouse.com/docs/en/sql-reference/statements/exchange
- ClickHouse CREATE TABLE docs: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse RENAME TABLE docs: https://clickhouse.com/docs/en/sql-reference/statements/rename
- ClickHouse Atomic database engine docs: https://clickhouse.com/docs/en/engines/database-engines/atomic

## Issues Found
No technical issues found. All SQL syntax, semantics, and claims match the official ClickHouse documentation:

- `EXCHANGE TABLES a AND b [ON CLUSTER cluster]` is the correct syntax.
- The atomicity claim ("no point in time does either name disappear") is confirmed by the official docs, which explicitly contrast EXCHANGE with the multi-step RENAME approach on that basis.
- The qualified-name note ("same database, or fully qualify both") is consistent with the docs' `[db0.]name_A AND [db1.]name_B` grammar.
- The schema claim ("do not need to have the same schema") matches the docs' own example, which exchanges tables with different column definitions.
- `CREATE TABLE events_shadow AS analytics.events` is the correct form for cloning a schema (without data).
- `SYSTEM RELOAD DICTIONARY` is the correct command to refresh a dictionary after swapping its source table.

## Review Notes
- **Atomic/Shared database engine requirement (not mentioned):** Per the official docs, `EXCHANGE TABLES` is supported only by the `Atomic` and `Shared` database engines, not by the legacy `Ordinary` engine. Since `Atomic` has been the default since ClickHouse 20.10/21.4, nearly all modern installations satisfy this requirement, but readers running older setups or explicitly using `Ordinary` databases would hit an error. The post does not make a wrong claim here, so no edit was needed, but a future revision could mention this constraint.
- **Multi-pair exchanges:** The docs note that `EXCHANGE TABLES a AND b, c AND d` is supported but performs exchanges sequentially, not atomically. The post wisely sticks to the single-pair form, which preserves the atomicity guarantee.
- **Replicated tables and ON CLUSTER:** The post correctly shows `ON CLUSTER` usage. Worth noting for future readers that when exchanging replicated (ReplicatedMergeTree) tables, the ZooKeeper paths remain bound to the underlying tables, not to the names — this is usually the desired behavior but can surprise users who expect paths to follow names.
