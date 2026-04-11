# Validation Summary: How to List All Indexes on a Table in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (SHOW INDEX statement)
- MySQL information_schema.STATISTICS table
- MySQL information_schema.TABLES table
- MySQL sys schema (schema_tables_with_full_table_scans, schema_unused_indexes views)
- MySQL command-line client

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: sys Schema — https://dev.mysql.com/doc/refman/8.0/en/sys-schema.html
- MySQL 8.0 Reference Manual: schema_tables_with_full_table_scans view — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-tables-with-full-table-scans.html
- MySQL 8.0 Reference Manual: schema_unused_indexes view — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-unused-indexes.html

## Issues Found
- **Misleading comment on sys.schema_tables_with_full_table_scans**: The SQL comment said "Tables with no indexes" but `sys.schema_tables_with_full_table_scans` shows tables that have experienced full table scans (based on performance_schema data), not tables that lack indexes. A table with indexes can still appear in this view if queries are not utilizing the indexes. Changed the comment to "Tables experiencing full table scans (may indicate missing indexes)" to accurately describe what the view returns.

## Review Notes
- The `IS_VISIBLE` column in the information_schema.STATISTICS query was introduced in MySQL 8.0. This query will fail on MySQL 5.7 or earlier. The post does not specify a MySQL version, but since MySQL 8.0 is the current GA release this is acceptable.
- The `sys` schema views require the Performance Schema to be enabled (which is the default in MySQL 8.0). If performance_schema is disabled, these views will return no data.
- All SQL syntax, column names, and query logic are correct and verified against official MySQL documentation.
