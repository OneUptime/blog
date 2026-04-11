# Validation Summary: How to Track MySQL Table Lock Contention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- Performance Schema (`global_status`, `table_lock_waits_summary_by_table`, `metadata_locks`)
- `sys` schema (`schema_table_lock_waits` view)
- MyISAM vs InnoDB locking behavior
- mysqladmin CLI
- Bash scripting for monitoring

## Sources Consulted
- MySQL 8.0 Reference Manual — Performance Schema Status Variable Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual — `data_lock_waits` Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — `metadata_locks` Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-metadata-locks-table.html
- MySQL 8.0 Reference Manual — `table_lock_waits_summary_by_table` Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-lock-waits-summary-by-table-table.html
- MySQL 8.0 Reference Manual — `sys.schema_table_lock_waits` View: https://dev.mysql.com/doc/refman/8.0/en/sys-schema-table-lock-waits.html
- MySQL 8.0 Reference Manual — Performance Schema Timer Units: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.0 Reference Manual — Server Status Variables (`Table_locks_waited`, `Table_locks_immediate`): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found

### 1. Wrong table used for finding table lock waits
- **What was wrong:** The "Finding Lock Waits with Performance Schema" section used `performance_schema.data_lock_waits`, which tracks InnoDB **row-level** (data) lock waits, not table-level lock waits. This is fundamentally the wrong table for an article about table lock contention.
- **What was changed:** Replaced the `data_lock_waits` query with a query against `sys.schema_table_lock_waits`, which is specifically designed to show sessions waiting for and blocking table-level metadata locks. This view uses `performance_schema.metadata_locks` under the hood and provides the same waiting/blocking thread and query information the original query intended.
- **Why:** `data_lock_waits` only shows InnoDB engine-level locks (row locks, gap locks, next-key locks). Table-level lock contention — from MyISAM table locks, `LOCK TABLES`, and DDL metadata locks — is surfaced through the metadata locks subsystem, not the data locks subsystem.

### 2. Incorrect timer unit and divisor in historical lock wait query
- **What was wrong:** The comment said "nanoseconds" and the query divided `SUM_TIMER_WAIT` by `1e9`, with the result aliased as `total_wait_sec`. Performance Schema timers use **picoseconds** (10^-12 seconds), not nanoseconds. Dividing picoseconds by `1e9` yields milliseconds, not seconds.
- **What was changed:** Updated the comment from "nanoseconds" to "picoseconds" and changed the divisor from `1e9` to `1e12` so the result correctly represents seconds.
- **Why:** The MySQL Performance Schema documentation states that all timer columns use picoseconds as the unit. Using `1e9` would produce values 1000x larger than expected, making the output misleading for anyone using it for monitoring or alerting.

## Review Notes
- The contention ratio query works due to MySQL's implicit string-to-number conversion on `VARIABLE_VALUE` (which is stored as VARCHAR), but could be made more explicit with `CAST()`. This is a minor style point, not an error.
- The `ALTER TABLE ... ALGORITHM=INPLACE, LOCK=NONE` example is correct for MySQL 8.0. For MySQL 8.0.12+, `ALGORITHM=INSTANT` is available for adding columns and would be even faster, but `INPLACE` is not wrong.
- The `sys.schema_table_lock_waits` view requires the `wait/lock/metadata/sql/mdl` Performance Schema instrument to be enabled, which it is by default in MySQL 8.0.
