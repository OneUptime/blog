# Validation Summary: How to Analyze Index Usage in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- MySQL Performance Schema (`performance_schema`)
- MySQL sys Schema (`sys`)
- MySQL Information Schema (`information_schema`)
- EXPLAIN statement

## Sources Consulted
- MySQL 8.0 Reference Manual: table_io_waits_summary_by_index_usage — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-wait-summary-tables.html
- MySQL 8.0 Reference Manual: sys.schema_unused_indexes — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-unused-indexes.html
- MySQL 8.0 Reference Manual: Performance Schema Summary Tables (TRUNCATE behavior) — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-summary-tables.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: sys.schema_redundant_indexes — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-redundant-indexes.html

## Issues Found
No technical issues found.

## Review Notes
- The "Finding Redundant Indexes" section uses a manual self-join on `information_schema.STATISTICS` to find indexes sharing columns at the same position. While this is valid SQL, MySQL's `sys.schema_redundant_indexes` view is purpose-built for this task and would be a more robust approach — it correctly identifies indexes that are left-prefixes of other indexes and even provides a ready-to-use `sql_drop_index` column. A future improvement could mention this view alongside or instead of the manual query.
- The `COUNT_READ = 0 AND COUNT_FETCH = 0` filter in the first query is slightly redundant for table I/O (since `COUNT_READ` equals `COUNT_FETCH` for table I/O events), but this is harmless and arguably makes the intent clearer.
- The "5% selectivity" threshold mentioned as a heuristic for when the optimizer skips an index is a reasonable rule of thumb, though in practice the optimizer's decision depends on many factors (buffer pool size, data distribution, query structure, etc.).
