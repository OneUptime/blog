# Validation Summary: How to Identify Unused Indexes in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL Performance Schema (`performance_schema.table_io_waits_summary_by_index_usage`)
- MySQL sys Schema (`sys.schema_unused_indexes`)
- Invisible Indexes (MySQL 8.0+ feature)
- EXPLAIN query analysis

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Table I/O Wait Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-tables.html
- MySQL 8.0 Reference Manual: sys.schema_unused_indexes View — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-unused-indexes.html
- MySQL 8.0 Reference Manual: Invisible Indexes — https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: ALTER TABLE Syntax — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html

## Issues Found
- **Inaccurate description of `sys.schema_unused_indexes`**: The post stated "This view wraps the same `performance_schema` query in a convenient form." This is incorrect. The blog's manual query filters on `COUNT_READ = 0 AND COUNT_FETCH = 0` (indexes with no read activity), while `sys.schema_unused_indexes` filters on `COUNT_STAR = 0` (indexes with no I/O events at all, including write-path operations like locating rows for UPDATE/DELETE). These conditions can return different result sets — the sys view is more conservative. Fixed the description to accurately explain the difference.

## Review Notes
- The `COUNT_FETCH = 0` condition in the manual query is redundant when `COUNT_READ = 0` is already present, since MySQL documentation states COUNT_READ equals COUNT_FETCH for table I/O wait summaries. This is harmless and does not affect results, so it was left as-is.
- The invisible indexes feature (`ALTER INDEX ... INVISIBLE/VISIBLE`) requires MySQL 8.0+. The post does not explicitly state this version requirement. Readers on MySQL 5.7 or earlier will not have this feature available.
- The `sys` schema is installed by default in MySQL 5.7.7+ and 8.0+. The post does not mention version requirements, which could confuse users on older versions.
- The statement "Every index on a table must be updated on every INSERT, UPDATE, and DELETE" is a slight simplification — for UPDATE operations, only indexes on modified columns need updating. This is an acceptable simplification for the context of the article.
