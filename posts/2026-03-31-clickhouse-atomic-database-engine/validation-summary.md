# Validation Summary: How to Use Atomic Database Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Atomic database engine
- ClickHouse Ordinary database engine
- SQL DDL (CREATE DATABASE, RENAME TABLE, EXCHANGE TABLES, DROP TABLE, ALTER DATABASE)
- ClickHouse system tables (system.databases, system.tables)

## Sources Consulted
- [ClickHouse Atomic Database Engine docs](https://clickhouse.com/docs/en/engines/database-engines/atomic)
- [ClickHouse RENAME statement docs](https://clickhouse.com/docs/en/sql-reference/statements/rename)
- [Altinity KB: Atomic Database Engine](https://kb.altinity.com/engines/altinity-kb-atomic-database-engine/)
- [Altinity KB: How to Convert Ordinary to Atomic](https://kb.altinity.com/engines/altinity-kb-atomic-database-engine/how-to-convert-ordinary-to-atomic/)
- ClickHouse GitHub PR #15003 (Enable Atomic database engine by default)
- ClickHouse GitHub PR #39933 (Add flag that enables automatic conversion from Ordinary to Atomic)
- ClickHouse GitHub Issue #39546 (Mechanism to migrate databases from Ordinary to Atomic)

## Issues Found

1. **Incorrect version for default engine.** The post stated "The Atomic database engine is the default database engine in ClickHouse since version 20.5." The Atomic engine was *introduced* in 20.5 but only became the *default* database engine in 20.10 (see ClickHouse PR #15003). Updated the intro to clarify both the introduction version (20.5) and the default-since version (20.10).

2. **Invalid `ALTER DATABASE ... MODIFY ENGINE` syntax.** The "Migrating from Ordinary to Atomic" section recommended `ALTER DATABASE mydb MODIFY ENGINE Atomic;` as the conversion method. This syntax does not exist in ClickHouse. The officially supported mechanism (added via PR #39933 in ClickHouse 22.8+) is to create the empty flag file `/var/lib/clickhouse/flags/convert_ordinary_to_atomic` and restart the server, which converts all Ordinary databases to Atomic on startup. Replaced the invalid ALTER example with the correct flag-file + restart procedure.

## Review Notes

- The `RENAME TABLE` example with two renames in a single statement is fast and uses metadata-only swaps in Atomic databases. For strictly atomic two-table swaps, `EXCHANGE TABLES` (shown later in the post) is the stronger guarantee; the post already covers `EXCHANGE TABLES` in its own section, so this is adequately addressed.
- Cross-database `RENAME TABLE` requires both databases to use the Atomic engine *and* reside on the same filesystem — the post correctly mentions the Atomic-engine requirement. The filesystem caveat is a minor detail that could be added in a future revision but is not a technical error.
- The `DROP TABLE` non-blocking behavior description is accurate; background deletion is governed by the `database_atomic_delay_before_drop_table_sec` server setting (not mentioned in the post, but the high-level description is correct).
- The UUID-based storage path description is accurate — data paths under `store/<uuid-prefix>/<uuid>/` decouple logical names from physical storage.
