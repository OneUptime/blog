# Validation Summary: What Is the Performance Schema in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL Performance Schema
- MySQL 5.6+ / 8.0+ (data_locks tables require 8.0)
- SQL querying of performance instrumentation tables
- sys schema (mentioned briefly)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema memory summary tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-memory-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema statement summary tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema file summary tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-file-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema data lock tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html)
- MySQL 8.0 Reference Manual: Performance Schema data lock waits table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html)
- MySQL 8.0 Reference Manual: Performance Schema setup tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-tables.html)

## Issues Found
- **Incorrect column name in Memory Usage query**: The column `CURRENT_NUMBER_OF_ALLOCS` does not exist in the `memory_summary_global_by_event_name` table. The correct column name is `CURRENT_COUNT_USED`, which represents the current number of allocations that have not yet been freed (COUNT_ALLOC minus COUNT_FREE). Fixed in the README.

## Review Notes
- The `data_locks` and `data_lock_waits` tables used in the lock contention section are MySQL 8.0+ only. The post mentions "MySQL 5.6+" for when Performance Schema was enabled by default, but does not note that these specific tables require 8.0. This is not incorrect but could be clarified in a future revision.
- Timer values in Performance Schema are stored in picoseconds. The division by 1e9 to get milliseconds is correct (1 ms = 1e9 ps).
- All other SQL queries, table names, column names, and technical explanations are accurate.
