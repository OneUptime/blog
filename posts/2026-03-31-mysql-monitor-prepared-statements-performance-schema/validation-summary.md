# Validation Summary: How to Monitor Prepared Statements with Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+ Performance Schema
- Prepared Statements (server-side)
- `prepared_statements_instances` table
- `events_statements_history_long` table
- `max_prepared_stmt_count` system variable

## Sources Consulted
- MySQL 8.0 Reference Manual: prepared_statements_instances Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-prepared-statements-instances-table.html
- MySQL 8.0 Reference Manual: Performance Schema Timing — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.0 Reference Manual: events_statements_history_long Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-history-long-table.html
- MySQL 8.0 Reference Manual: events_statements_current Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-current-table.html
- MySQL 8.0 Reference Manual: Prepared Statements — https://dev.mysql.com/doc/refman/8.0/en/sql-prepared-statements.html

## Issues Found
No technical issues found.

All column names referenced in queries (`STATEMENT_ID`, `STATEMENT_NAME`, `SQL_TEXT`, `OWNER_THREAD_ID`, `OWNER_OBJECT_TYPE`, `COUNT_REPREPARE`, `COUNT_EXECUTE`, `SUM_TIMER_EXECUTE`, `AVG_TIMER_EXECUTE`, `MAX_TIMER_EXECUTE`, `SUM_ROWS_EXAMINED`, `SUM_ROWS_SENT`, `TIMER_WAIT`, `ROWS_EXAMINED`, `ROWS_SENT`) are valid. Timer conversion from picoseconds to milliseconds using division by 1e9 is mathematically correct. The `max_prepared_stmt_count` variable name is accurate. The explanation of re-prepare triggers (DDL/metadata invalidation) is correct per MySQL documentation.

## Review Notes
- Performance Schema timer values are stored in picoseconds. The post divides by `1e9` to get milliseconds, which is correct (1 ms = 10^9 ps). This could benefit from a brief inline note for readers unfamiliar with Performance Schema timer units, but it is not an error.
- The re-prepare percentage query uses MySQL's `/` operator which performs floating-point division (not integer division via `DIV`), so the calculation is correct.
- The `events_statements_history_long` table requires the `events_statements_history_long` consumer to be enabled in Performance Schema configuration. The post does not mention this prerequisite, but this is a minor omission rather than an error.
- The `prepared_statements_instances` table only shows currently active prepared statements. Once a prepared statement is deallocated, its row disappears. The post correctly states it shows "all currently allocated prepared statements."
