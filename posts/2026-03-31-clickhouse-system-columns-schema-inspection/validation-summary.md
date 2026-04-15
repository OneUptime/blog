# Validation Summary: How to Use system.columns for Schema Inspection in ClickHouse

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- ClickHouse (SQL database)
- system.columns system table
- ClickHouse SQL dialect (LIKE, IS NULL, IN, DISTINCT, subqueries)

## Sources Consulted
- ClickHouse official documentation for system.columns: https://clickhouse.com/docs/operations/system-tables/columns
- ClickHouse Nullable data type documentation: https://clickhouse.com/docs/sql-reference/data-types/nullable
- ClickHouse system.tables documentation: https://clickhouse.com/docs/operations/system-tables/tables

## Issues Found
1. **Missing database filter in subquery (Compression Codec audit section)**: The subquery `SELECT name FROM system.tables WHERE engine = 'View'` did not filter by `database = 'mydb'`, meaning it would collect View names from all databases. If a View in another database shared a name with a regular table in `mydb`, that table would be incorrectly excluded from the results. Fixed by adding `AND database = 'mydb'` to the subquery.

## Review Notes
- The `IS NULL` checks on `compression_codec` and `comment` (in the "Auditing Compression Codecs" and "Schema Documentation Audit" sections) are technically redundant because these columns are `String` type in system tables, not `Nullable(String)`, so they can never be NULL — only empty strings. The queries still produce correct results since the `OR compression_codec = ''` / `OR comment = ''` clause handles the actual case. This is defensive coding, not a bug, so it was left as-is.
- The post does not mention the `EPHEMERAL` default kind (added in ClickHouse 22.1+). This is an omission rather than an error, as the listed values (DEFAULT, MATERIALIZED, ALIAS) are the primary kinds.
- All column names referenced (database, table, name, type, position, default_kind, default_expression, compression_codec, comment) are verified to exist in the system.columns table.
- All SQL syntax (LIKE patterns, IN clauses, ORDER BY, SELECT DISTINCT, subqueries) is valid ClickHouse SQL.
