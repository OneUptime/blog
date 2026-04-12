# Validation Summary: How to Use the sys Schema in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 5.7+ / MySQL 8.0
- MySQL sys schema (views, stored procedures, functions)
- MySQL Performance Schema (underlying data source)
- MySQL information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual — sys Schema (https://dev.mysql.com/doc/refman/8.0/en/sys-schema.html)
- MySQL 8.0 Reference Manual — sys Schema views: statement_analysis, statements_with_full_table_scans, schema_unused_indexes, schema_redundant_indexes, schema_table_statistics, session, memory_by_user_by_current_bytes, io_global_by_file_by_latency (https://dev.mysql.com/doc/refman/8.0/en/sys-schema-views.html)
- MySQL 8.0 Reference Manual — sys.diagnostics procedure (https://dev.mysql.com/doc/refman/8.0/en/sys-diagnostics.html)
- MySQL 8.0 Reference Manual — sys.table_exists procedure (https://dev.mysql.com/doc/refman/8.0/en/sys-table-exists.html)
- MySQL 8.0 Reference Manual — Performance Schema timing units (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)

## Issues Found
1. **Incorrect unit for x$ view latency values**: The inline comment in the `sys.x$statement_analysis` example stated `total_latency` returns "nanoseconds as a number." MySQL Performance Schema stores all timing data in **picoseconds** (trillionths of a second), not nanoseconds. The x$ raw views return these picosecond values directly. Changed "nanoseconds" to "picoseconds."

## Review Notes
- All sys schema view names and column names were verified against official MySQL 8.0 documentation and are correct.
- The `sys.diagnostics()` and `sys.table_exists()` stored procedure calls use correct parameter signatures.
- The "Finding Tables Without a Primary Key" section uses an `information_schema` query rather than a sys schema view. This is technically correct since the sys schema does not provide a dedicated view for this purpose, but it is slightly out of scope for a sys schema article. Not changed since the query is valid and useful in context.
- The post correctly notes that sys schema is available by default in MySQL 5.7+ and 8.0.
