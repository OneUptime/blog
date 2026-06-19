# Validation Summary: How to Configure MySQL Performance Schema

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- MySQL Performance Schema
- MySQL sys schema
- InnoDB transaction and lock monitoring
- SQL monitoring queries
- MySQL server configuration

## Sources Consulted
- MySQL 8.4 Reference Manual: Performance Schema Quick Start - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-quick-start.html
- MySQL 8.4 Reference Manual: Performance Schema System Variables - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-system-variables.html
- MySQL 8.4 Reference Manual: Performance Schema Statement Event Tables - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-tables.html
- MySQL 8.4 Reference Manual: events_statements_current Table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html
- MySQL 8.4 Reference Manual: Statement Summary Tables - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html
- MySQL 8.4 Reference Manual: Connection Tables and accounts Table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-connection-tables.html
- MySQL 8.4 Reference Manual: data_locks and data_lock_waits Tables - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-locks-table.html and https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html
- MySQL 8.4 Reference Manual: InnoDB Transaction and Locking Information - https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-understanding-innodb-locking.html
- MySQL 8.4 Reference Manual: Memory Summary Tables and Memory-Allocation Model - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-memory-summary-tables.html and https://dev.mysql.com/doc/refman/8.4/en/performance-schema-memory-model.html
- MySQL 8.4 Reference Manual: sys.ps_truncate_all_tables() - https://dev.mysql.com/doc/refman/8.4/en/sys-ps-truncate-all-tables.html

## Issues Found
- The architecture diagram referenced `memory_summary_by_thread`, which is not the Performance Schema table name. Changed it to `memory_summary_by_thread_by_event_name`.
- The memory usage comment said it calculated a percentage of server memory, but the query returns megabytes used. Updated the comment to match the query.
- The currently running statements query selected a nonexistent `STATE` column from `events_statements_current`. Removed `STATE` and added `END_EVENT_ID IS NULL` so the query only returns active statement events.
- The lock-wait query used `information_schema.innodb_lock_waits`, which is removed in MySQL 8.0. Replaced it with `performance_schema.data_lock_waits` and the current transaction-id column names.
- The row-lock contention query used `table_io_waits_summary_by_index_usage`, which reports table I/O waits by index, not row locks. Replaced it with a `performance_schema.data_locks` query grouped by table, index, lock type, mode, and status.
- The connection statistics query selected `USER` from `performance_schema.hosts`, but `hosts` has no `USER` column. Changed it to use `performance_schema.accounts`.
- The reset section truncated `performance_schema.hosts` after switching the connection statistics example to account-level statistics. Changed it to truncate `performance_schema.accounts`.
- The `sys.ps_truncate_all_tables(FALSE)` comment said it reset all Performance Schema tables, but the procedure truncates Performance Schema summary tables. Updated the comment.
- Added a version caveat that `performance_schema.data_locks` and `performance_schema.data_lock_waits` require MySQL 8.0+.

## Review Notes
The post is technically relevant and validated after corrections. Some examples still assume sufficient Performance Schema privileges and enabled consumers/instruments, which is appropriate for a configuration guide but should be noted by operators when adapting the queries to locked-down production accounts.
