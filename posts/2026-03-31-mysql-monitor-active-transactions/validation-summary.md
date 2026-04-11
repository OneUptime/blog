# Validation Summary: How to Monitor Active Transactions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- `information_schema.INNODB_TRX` view
- `performance_schema.data_lock_waits` table
- `performance_schema.data_locks` table
- `performance_schema.events_transactions_summary_by_user_by_event_name` table
- `SHOW ENGINE INNODB STATUS` command

## Sources Consulted
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: The data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: The data_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual: Transaction Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-transaction-summary-tables.html
- MySQL 8.0 Reference Manual: SHOW ENGINE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: TIMESTAMPDIFF Function — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff

## Issues Found
No technical issues found.

## Review Notes
- The `performance_schema.data_lock_waits` and `performance_schema.data_locks` tables used in this post are MySQL 8.0+ only. In MySQL 5.7 (now end-of-life), these were `information_schema.INNODB_LOCK_WAITS` and `information_schema.INNODB_LOCKS`. The post does not explicitly state a MySQL version requirement, but since MySQL 5.7 reached end of life in October 2023, targeting 8.0+ is reasonable.
- The JOIN conditions between `INNODB_TRX.trx_id` (varchar) and `data_lock_waits.REQUESTING_ENGINE_TRANSACTION_ID` (bigint unsigned) rely on implicit type conversion, which works in practice but could be noted for clarity.
- The description of `trx_rows_locked` as "number of rows currently locked" is a slight simplification; the MySQL docs note it is an "approximate number" that may include delete-marked rows. This is acceptable for a tutorial context.
