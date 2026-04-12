# Validation Summary: How to Tune MySQL for High Concurrency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- ProxySQL (connection pooling)
- Percona Server thread pool
- Python mysql-connector-python library
- MySQL Performance Schema and Information Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Configuration — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: performance_schema.data_lock_waits — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: information_schema.innodb_lock_waits (removed) — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: innodb_buffer_pool_instances — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_instances
- mysql-connector-python documentation: Prepared Statements — https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursorprepared.html
- ProxySQL documentation — https://proxysql.com/documentation/
- MySQL 8.0 Reference Manual: Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html

## Issues Found

1. **Lock wait query used removed MySQL 5.7 tables**: The query for checking blocking transactions used `information_schema.innodb_lock_waits` with columns `blocking_trx_id` and `requesting_trx_id`. This table was removed in MySQL 8.0. Fixed to use `performance_schema.data_lock_waits` with columns `BLOCKING_ENGINE_TRANSACTION_ID` and `REQUESTING_ENGINE_TRANSACTION_ID`, which is the correct MySQL 8.0+ equivalent.

2. **Python prepared statements code was incorrect**: The code used `cursor.prepare()` which does not exist in the `mysql-connector-python` library. When creating a cursor with `prepared=True`, you pass the SQL string directly to `execute()` or `executemany()`. Also changed placeholders from `?` to `%s`, which is the correct parameter marker for `mysql-connector-python` (even in prepared statement mode).

## Review Notes
- The `binlog_format = ROW` setting mentioned in the READ COMMITTED section is deprecated in MySQL 8.0.34+ and removed in MySQL 8.4 (ROW is the only format). This is still correct advice for MySQL 8.0 users on older patch versions but will become unnecessary as users upgrade.
- The `innodb_buffer_pool_instances` setting is deprecated in MySQL 8.4 LTS. The advice remains valid for MySQL 8.0 but may need updating for 8.4+.
- The `thread_handling = pool-of-threads` is specific to Percona Server; the post correctly notes this is for "MySQL Enterprise or Percona Server" but the syntax shown is Percona-specific (MySQL Enterprise uses a plugin-based approach).
- The `information_schema.processlist` used in the monitoring section still works in MySQL 8.0 but `performance_schema.processlist` is the recommended replacement for better performance.
