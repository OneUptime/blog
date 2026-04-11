# Validation Summary: What Is a Deadlock in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL/DML statements, transaction control)
- Python (pymysql library for deadlock retry example)
- MySQL Performance Schema
- MySQL information_schema.INNODB_METRICS

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Deadlocks — https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html
- MySQL 8.0 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: INNODB_METRICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-metrics-table.html
- MySQL 8.0 Reference Manual: Performance Schema Error Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-error-summary-tables.html
- MySQL 8.0 Reference Manual: SHOW ENGINE INNODB STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: innodb_print_all_deadlocks — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks
- PyMySQL documentation — https://pymysql.readthedocs.io/

## Issues Found

### 1. Invalid status variable `Innodb_deadlocks`
- **What was wrong:** The "Monitoring Deadlock Frequency" section used `SHOW STATUS LIKE 'Innodb_deadlocks'` to check deadlock count. `Innodb_deadlocks` is not a standard MySQL server status variable and this query would return an empty result set.
- **What was changed:** Replaced with a query against `information_schema.INNODB_METRICS` using the `lock_deadlocks` counter, which is the correct and documented way to retrieve the deadlock count since server start.

### 2. Misleading performance_schema query
- **What was wrong:** The query against `performance_schema.events_waits_summary_global_by_event_name` with `WHERE event_name LIKE '%deadlock%'` would not return meaningful deadlock count data. There is no standard wait event instrument with "deadlock" in its name that tracks deadlock occurrences.
- **What was changed:** Replaced with a query against `performance_schema.events_errors_summary_global_by_error` filtering on `ERROR_NUMBER = 1213` (the deadlock error code), which correctly tracks how many times the deadlock error has been raised. Added a note that this requires MySQL 8.0.11+.

## Review Notes
- The post correctly explains InnoDB's wait-for graph based deadlock detection and victim selection based on transaction weight (undo log size / rows modified).
- The classic deadlock scenario SQL example is accurate and clearly demonstrates the circular wait condition.
- The `SELECT ... FOR UPDATE` with `ORDER BY id` prevention strategy is a commonly recommended approach, though the actual lock acquisition order may depend on the query execution plan in complex scenarios.
- The Python retry code correctly handles error 1213 with backoff. Calling `conn.rollback()` after a deadlock is technically redundant (InnoDB already rolled back the victim transaction) but is good practice to reset the client-side connection state.
- The post does not mention the `innodb_deadlock_detect` system variable (MySQL 8.0+) which can disable deadlock detection. This is a simplification, not an error, since the variable defaults to ON.
