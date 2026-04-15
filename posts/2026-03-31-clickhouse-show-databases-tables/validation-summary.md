# Validation Summary: How to Use SHOW DATABASES and SHOW TABLES in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, SHOW statements, system tables)
- SQL (LIKE pattern matching, wildcard syntax)

## Sources Consulted
- ClickHouse official documentation: SHOW DATABASES — https://clickhouse.com/docs/en/sql-reference/statements/show#show-databases
- ClickHouse official documentation: SHOW TABLES — https://clickhouse.com/docs/en/sql-reference/statements/show#show-tables
- ClickHouse official documentation: SHOW DICTIONARIES — https://clickhouse.com/docs/en/sql-reference/statements/show#show-dictionaries
- ClickHouse official documentation: system.tables — https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse official documentation: system.databases — https://clickhouse.com/docs/en/operations/system-tables/databases
- ClickHouse source code (InterpreterShowTablesQuery.cpp) for SHOW FULL TABLES behavior

## Issues Found

1. **SHOW DATABASES does not support WHERE clause.** The post used `SHOW DATABASES WHERE name NOT IN (...)` which is invalid syntax. ClickHouse's SHOW DATABASES only supports LIKE/ILIKE for filtering. Fixed by replacing with a `SELECT name FROM system.databases WHERE ...` query and noting the limitation.

2. **SHOW TABLES does not support WHERE clause.** The post used `SHOW TABLES FROM analytics WHERE name LIKE 'session%' OR name LIKE 'funnel%'` which is invalid syntax. ClickHouse's SHOW TABLES only supports LIKE/ILIKE for filtering. Fixed by replacing with a `SELECT name FROM system.tables WHERE ...` query and noting the limitation.

3. **SHOW FULL TABLES returns `engine`, not `table_type`.** The post claimed SHOW FULL TABLES adds a `table_type` column with MySQL-style values (`BASE TABLE`, `VIEW`). In ClickHouse, SHOW FULL TABLES adds an `engine` column with ClickHouse engine names (e.g., `MergeTree`, `View`). Fixed the example output and description to reflect the actual behavior.

4. **Summary section referenced incorrect `table_type` column.** Updated to correctly reference the `engine` column and clarified that WHERE filtering requires querying system tables directly.

## Review Notes
- The `system.tables` queries in the "Practical Patterns" section are all correct — `total_rows`, `total_bytes`, `engine`, `database`, and `name` columns all exist.
- SHOW DICTIONARIES syntax with FROM clause is correct per the documentation.
- ClickHouse also supports `ILIKE` (case-insensitive LIKE) on SHOW statements, which the post does not mention but is not required for correctness.
- The SHOW statements also support a `LIMIT` clause not mentioned in the post, but omitting it is not an error.
