# Validation Summary: How to Fix ERROR 1205 Lock Wait Timeout Exceeded in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL 5.6/5.7 information_schema lock tables
- MySQL 8.0+ performance_schema lock tables
- Python (mysql.connector library)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: innodb_lock_wait_timeout — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout
- MySQL 8.0 Reference Manual: data_lock_waits table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: innodb_trx table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 5.7 Reference Manual: innodb_lock_waits table — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: KILL statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL Connector/Python API Reference — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
No technical issues found.

## Review Notes
- The first diagnostic query (`information_schema.innodb_lock_waits`) is correctly applicable to MySQL 5.6/5.7 only. The `innodb_lock_waits` and `innodb_locks` information_schema tables were removed in MySQL 8.0 and replaced by `performance_schema.data_lock_waits` and `performance_schema.data_locks`. The post handles this distinction correctly by providing a separate MySQL 8.0+ query.
- The `events_statements_current.SQL_TEXT` column may be NULL for idle blocking threads (i.e., the blocking statement has already completed and the transaction is sitting idle). This is a practical limitation but not a technical error in the query.
- The post correctly notes that only the waiting transaction's statement is rolled back, not the blocking transaction. This behavior is controlled by `innodb_rollback_on_timeout` (default OFF), meaning only the last statement is rolled back, not the entire transaction.
