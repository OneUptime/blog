# Validation Summary: How to Use system.databases in ClickHouse

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse (system tables, database engines, SQL queries)
- ClickHouse system.databases catalog table
- ClickHouse database engines: Atomic, Ordinary, Memory, Lazy, MySQL, PostgreSQL, MaterializedMySQL, Replicated

## Sources Consulted
- ClickHouse official documentation: system.databases table (https://clickhouse.com/docs/en/operations/system-tables/databases)
- ClickHouse official documentation: Database Engines overview (https://clickhouse.com/docs/en/engines/database-engines)
- ClickHouse official documentation: Atomic database engine (https://clickhouse.com/docs/en/engines/database-engines/atomic)
- ClickHouse official documentation: ALTER DATABASE statement (https://clickhouse.com/docs/en/sql-reference/statements/alter/database)
- ClickHouse official documentation: system.tables table (https://clickhouse.com/docs/en/operations/system-tables/tables)

## Issues Found

1. **ALTER DATABASE COMMENT syntax (lines 137-138):** The post used `ALTER DATABASE analytics COMMENT '...'` but the correct ClickHouse syntax requires the `MODIFY` keyword: `ALTER DATABASE analytics MODIFY COMMENT '...'`. Fixed both ALTER statements to use `MODIFY COMMENT`.

2. **Redundant IS NULL check on non-nullable column (line 88):** The `comment` column in `system.databases` is of type `String` (not `Nullable(String)`), so `comment IS NULL` can never be true — non-nullable String columns default to empty string `''` in ClickHouse. Removed the redundant `OR comment IS NULL` condition, keeping only `WHERE comment = ''`.

## Review Notes
- The Key Columns table omits the `is_external` (UInt8) column that also exists in `system.databases`. This is a minor omission since the post does not claim to list every column.
- The database engine list does not include newer engines such as Shared (ClickHouse Cloud default), SQLite, MaterializedPostgreSQL, DataLakeCatalog, and Backup. These are less common and the post's list covers the most widely-used engines.
- The `total_bytes` and `total_rows` columns in `system.tables` (used in the Storage Size query) are `Nullable(UInt64)`. The `SUM` function handles NULLs correctly by ignoring them, so the query works as expected.
- MaterializedMySQL is a real ClickHouse database engine (experimental/deprecated in some versions) that replicates MySQL via binlog. The post's description is accurate.
