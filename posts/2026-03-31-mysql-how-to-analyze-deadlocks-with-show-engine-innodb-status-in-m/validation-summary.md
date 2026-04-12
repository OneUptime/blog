# Validation Summary: How to Analyze Deadlocks with SHOW ENGINE INNODB STATUS in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0)
- InnoDB storage engine
- InnoDB deadlock detection and lock management
- Performance Schema (`data_lock_waits`)
- Information Schema (`innodb_lock_waits`, `innodb_trx`)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Deadlock Detection — https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html
- MySQL 8.0 Reference Manual: SHOW ENGINE INNODB STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: innodb_print_all_deadlocks — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks
- MySQL 8.0 Reference Manual: data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 5.7 Reference Manual: innodb_lock_waits Table — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: SELECT ... FOR UPDATE — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html

## Issues Found
No technical issues found.

## Review Notes
- The section "Querying the Performance Schema for Lock Waits" first shows a query using `information_schema.innodb_lock_waits` (MySQL 5.7), then correctly notes the MySQL 8.0 replacement. The heading mentions "Performance Schema" while the first query uses `information_schema`, but the body text properly distinguishes between the two versions.
- The deadlock output example simplifies table names (e.g., `table orders` instead of the fully qualified `` `database`.`orders` `` format seen in real output), which is acceptable for readability in a tutorial context.
- The `information_schema.innodb_lock_waits` and `information_schema.innodb_locks` tables were removed in MySQL 8.0. The post correctly addresses this by providing the `performance_schema.data_lock_waits` alternative, but readers on MySQL 8.0+ should be aware only the second query applies.
