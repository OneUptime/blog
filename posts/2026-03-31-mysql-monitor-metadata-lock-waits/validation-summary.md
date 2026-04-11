# Validation Summary: How to Monitor Metadata Lock Waits in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL Performance Schema (`performance_schema.metadata_locks`, `setup_instruments`, `setup_consumers`, `threads`, `events_statements_current`)
- MySQL `information_schema.processlist` and `information_schema.innodb_trx`
- MySQL `sys.schema_table_lock_waits` view
- MySQL metadata lock (MDL) subsystem
- `lock_wait_timeout` session variable

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema metadata_locks Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-metadata-locks-table.html)
- MySQL 8.0 Reference Manual: Performance Schema setup_instruments Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html)
- MySQL 8.0 Reference Manual: Performance Schema setup_consumers Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html)
- MySQL 8.0 Reference Manual: Performance Schema threads Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html)
- MySQL 8.0 Reference Manual: sys.schema_table_lock_waits view (https://dev.mysql.com/doc/refman/8.0/en/sys-schema-table-lock-waits.html)
- MySQL 8.0 Reference Manual: information_schema.processlist Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html)
- MySQL 8.0 Reference Manual: information_schema.innodb_trx Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html)
- MySQL 8.0 Reference Manual: lock_wait_timeout system variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_lock_wait_timeout)
- MySQL 8.0 Reference Manual: General Thread States (https://dev.mysql.com/doc/refman/8.0/en/general-thread-states.html)

## Issues Found
- **Misleading column alias in "Checking for Active MDL Waits" query**: `pl.ID AS thread_id` was incorrect. `information_schema.processlist.ID` is the processlist/connection ID (equivalent to `CONNECTION_ID()`), not the Performance Schema `THREAD_ID`. These are distinct values in MySQL — the `THREAD_ID` from `performance_schema.threads` is an internal identifier that differs from the processlist ID. The alias was changed to `process_id` to avoid confusion when readers try to correlate this value with other Performance Schema tables.

## Review Notes
- All Performance Schema table and column names verified as correct for MySQL 8.0.
- The MDL instrument name `wait/lock/metadata/sql/mdl` is correct. In MySQL 8.0, this instrument is enabled by default, but the explicit enable is still good practice and necessary for MySQL 5.7.
- The `sys.schema_table_lock_waits` view columns (`waiting_pid`, `waiting_query`, `waiting_lock_type`, `blocking_pid`, `blocking_query`, `blocking_lock_type`, `blocking_trx_age`, `sql_kill_blocking_connection`) are all valid.
- The thread state strings (`Waiting for table metadata lock`, `Waiting for stored procedure metadata lock`, `Waiting for trigger metadata lock`) are valid MySQL thread states.
- The blocker/waiter query correctly uses LEFT JOINs to `events_statements_current` since the blocking session may not have an active statement if it completed its query but hasn't committed.
- `information_schema.processlist` is still functional in MySQL 8.0 but `performance_schema.processlist` is the recommended alternative for better performance (avoids the global mutex). This is a minor optimization opportunity, not an error.
