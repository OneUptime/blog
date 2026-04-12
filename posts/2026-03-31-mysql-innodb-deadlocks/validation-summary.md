# Validation Summary: How to Monitor InnoDB Deadlocks in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- InnoDB deadlock detection and lock-wait graph
- Performance Schema (`data_lock_waits`, `global_status`)
- `information_schema.innodb_trx`

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking and Transaction Model (https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-transaction-model.html)
- MySQL 8.0 Reference Manual: InnoDB Deadlock Detection (https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html)
- MySQL 8.0 Reference Manual: SHOW ENGINE INNODB STATUS (https://dev.mysql.com/doc/refman/8.0/en/show-engine.html)
- MySQL 8.0 Reference Manual: innodb_print_all_deadlocks (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks)
- MySQL 8.0 Reference Manual: innodb_deadlock_detect (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_deadlock_detect)
- MySQL 8.0 Reference Manual: innodb_lock_wait_timeout (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout)
- MySQL 8.0 Reference Manual: performance_schema.data_lock_waits (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html)
- MySQL 8.0 Reference Manual: InnoDB Server Status Variables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: Transaction Isolation Levels (https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes the `data_lock_waits` query is MySQL 8.0+. In MySQL 5.7 and earlier, the equivalent table was `information_schema.INNODB_LOCK_WAITS` with different column names. Readers on older versions would need to adapt.
- The `innodb_deadlock_detect` variable was introduced in MySQL 8.0.0. Disabling it is a valid technique for high-concurrency workloads where the deadlock detection algorithm's mutex contention becomes a bottleneck, but the post could note this is an advanced tuning option that should be used with caution (transactions will simply wait until timeout instead of being detected quickly).
- All SQL syntax, variable names, Performance Schema table/column names, and configuration directives are accurate for MySQL 8.0+.
