# Validation Summary: How to Find the Most Resource-Intensive Queries with sys Schema in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL sys schema
- MySQL Performance Schema (underlying data source)
- SQL query analysis and optimization

## Sources Consulted
- MySQL 8.0 Reference Manual — sys.statement_analysis view: https://dev.mysql.com/doc/refman/8.0/en/sys-statement-analysis.html
- MySQL 8.0 Reference Manual — sys.statements_with_errors_or_warnings view: https://dev.mysql.com/doc/refman/8.0/en/sys-statements-with-errors-or-warnings.html
- MySQL 8.0 Reference Manual — sys.statements_with_full_table_scans view: https://dev.mysql.com/doc/refman/8.0/en/sys-statements-with-full-table-scans.html
- MySQL 8.0 Reference Manual — sys schema overview: https://dev.mysql.com/doc/refman/8.0/en/sys-schema.html

## Issues Found
No technical issues found.

All three sys schema view names are correct and exist in MySQL 5.7+ and 8.0+. Every column referenced in the SQL queries (`query`, `exec_count`, `total_latency`, `avg_latency`, `max_latency`, `rows_examined_avg`, `rows_sent_avg`, `tmp_tables`, `full_scans`, `tmp_disk_tables`, `errors`, `warnings`, `last_seen`, `no_index_used_count`, `no_good_index_used_count`) is a valid column in the respective view. All SQL syntax is correct and the queries would execute successfully on a MySQL instance with the sys schema installed.

## Review Notes
- The sys schema is included by default in MySQL 5.7.7+ and all MySQL 8.0 releases. For earlier versions, it must be installed manually.
- The post correctly describes the relationship between the sys schema and Performance Schema.
- The explanation that high row examination ratios indicate missing indexes is accurate and well-stated.
- The `ROUND(rows_examined_avg / rows_sent_avg, 0)` calculation includes a proper `WHERE rows_sent_avg > 0` guard to prevent division by zero, which is good practice.
- The post selects the most relevant columns for each use case rather than listing all available columns, which is appropriate for a focused tutorial.
