# Validation Summary: How to Find Tables with Full Table Scans Using sys Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL sys schema
- MySQL Performance Schema
- MySQL INFORMATION_SCHEMA
- SQL query optimization and indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: sys.schema_tables_with_full_table_scans (https://dev.mysql.com/doc/refman/8.0/en/sys-schema-tables-with-full-table-scans.html)
- MySQL 8.0 Reference Manual: sys.statements_with_full_table_scans (https://dev.mysql.com/doc/refman/8.0/en/sys-statements-with-full-table-scans.html)
- MySQL 8.0 Reference Manual: table_io_waits_summary_by_index_usage (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html)
- MySQL 8.0 Reference Manual: events_statements_summary_by_digest (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Event Timing (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)

## Issues Found
- **Non-existent column `full_scans` in `sys.statements_with_full_table_scans` query**: The original query selected a column called `full_scans` and used it in the ORDER BY clause. This column does not exist in the `sys.statements_with_full_table_scans` view. Replaced `full_scans` with `no_good_index_used_count` in the SELECT list, and changed `ORDER BY full_scans DESC` to `ORDER BY no_index_used_count DESC` to sort by the most meaningful metric (count of times no index was used).

## Review Notes
- The `sys.schema_tables_with_full_table_scans` query correctly uses the documented columns: `object_schema`, `object_name`, `rows_full_scanned`, and `latency`.
- The `INDEX_NAME IS NULL` filter on `table_io_waits_summary_by_index_usage` is the correct and documented way to identify full table scan I/O.
- The `SUM_TIMER_READ / 1e12` conversion from picoseconds to seconds is correct per MySQL documentation.
- The `events_statements_summary_by_digest` query correctly uses `DIGEST_TEXT`, `COUNT_STAR`, and `SUM_NO_INDEX_USED`.
- The cross-reference JOIN between `information_schema.TABLES` and `performance_schema.table_io_waits_summary_by_index_usage` is valid and useful.
- None.
