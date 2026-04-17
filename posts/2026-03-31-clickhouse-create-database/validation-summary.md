# Validation Summary: How to Create a Database in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL DDL (`CREATE DATABASE`, `DROP DATABASE`, `SHOW DATABASES`, `SHOW CREATE DATABASE`)
- ClickHouse database engines: Atomic, Ordinary, Memory, Lazy, MySQL, PostgreSQL, SQLite
- `ON CLUSTER` distributed DDL
- `system.databases` system table

## Sources Consulted
- [CREATE DATABASE | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/create/database)
- [Database Engines | ClickHouse Docs](https://clickhouse.com/docs/engines/database-engines)
- [MySQL Database Engine | ClickHouse Docs](https://clickhouse.com/docs/engines/database-engines/mysql)
- [PostgreSQL Database Engine | ClickHouse Docs](https://clickhouse.com/docs/engines/database-engines/postgresql)
- [SQLite Database Engine | ClickHouse Docs](https://clickhouse.com/docs/engines/database-engines/sqlite)
- [Remove `Lazy` database engine - PR #93627](https://github.com/ClickHouse/ClickHouse/pull/93627) (merged 2026-01-25)
- [Remove database engine Lazy - Issue #91231](https://github.com/ClickHouse/ClickHouse/issues/91231)
- [Replicated Database Engine | ClickHouse Docs](https://clickhouse.com/docs/engines/database-engines/replicated)

## Issues Found

1. **Incorrect `Lazy` engine argument syntax.** The post used keyword-style `Lazy(expiration_time=3600)`, but ClickHouse SQL does not accept keyword arguments here - the engine takes a single positional integer representing seconds (the docs describe it as `expiration_time_in_seconds`). Fixed to `Lazy(3600)` and removed the misleading "argument name" explanation.

2. **Missing deprecation/removal note for `Lazy`.** The `Lazy` database engine was removed from ClickHouse in PR #93627 (merged 2026-01-25). For backward compatibility it is now interpreted as `Atomic`. Added a removal notice and a pointer to the `lazy_load_tables = 1` setting on `Atomic` as the modern replacement.

3. **Overstated claim about Atomic + ReplicatedMergeTree.** The post stated Atomic "is required for `ReplicatedMergeTree` tables", but ReplicatedMergeTree technically works on Ordinary databases too when explicit ZooKeeper paths are provided. Atomic is only required for the simplified `{uuid}` macro syntax. Softened the claim to "recommended" and added the reason.

## Review Notes
- The MySQL / PostgreSQL / SQLite engine argument signatures in the post match the current official docs.
- The `Ordinary` engine is documented as legacy/deprecated; the post correctly flags it as legacy.
- The `ON CLUSTER '{cluster}'` macro pattern and `SHOW CREATE DATABASE` / `system.databases` usage are all accurate.
- The post does not mention the `Replicated` database engine (distinct from `ReplicatedMergeTree`) or ClickHouse Cloud's `Shared` engine. These are not errors, but could be worth a future follow-up for completeness.
- The `COMMENT` clause and `IF NOT EXISTS` guards are accurately documented.
