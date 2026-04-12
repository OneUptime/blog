# Validation Summary: How to Find Slow Queries Using Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- MySQL query optimization
- MySQL server configuration (my.cnf)

## Sources Consulted
- MySQL Reference Manual: Performance Schema Statement Digests and `events_statements_summary_by_digest` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-digests.html)
- MySQL Reference Manual: Performance Schema `setup_consumers` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html)
- MySQL Reference Manual: Performance Schema `setup_instruments` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html)
- MySQL Reference Manual: Performance Schema `threads` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html)
- MySQL Reference Manual: Performance Schema `events_statements_current` table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-current-table.html)
- MySQL Reference Manual: Performance Schema Timer Units (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)

## Issues Found
No technical issues found.

## Review Notes
- The `NULLIF(SUM_ROWS_SENT, 0)` in the row examination query is technically redundant since the WHERE clause already filters `SUM_ROWS_SENT > 0`, but this is defensive programming and not an error.
- All Performance Schema timer values are correctly converted from picoseconds to seconds by dividing by `1e12`.
- All column names, table names, consumer names, and instrument patterns are accurate for MySQL 5.6+ through 8.x.
- The post correctly notes that `performance_schema=ON` must be set in `my.cnf` (requires server restart), while consumer and instrument changes can be made at runtime via UPDATE statements.
