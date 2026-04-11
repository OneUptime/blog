# Validation Summary: How to Query INFORMATION_SCHEMA.INNODB_LOCK_WAITS in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 5.7 (INFORMATION_SCHEMA.INNODB_LOCK_WAITS)
- MySQL 8.0 (performance_schema.data_lock_waits)
- InnoDB storage engine lock management
- INFORMATION_SCHEMA.INNODB_TRX
- performance_schema.threads

## Sources Consulted
- MySQL 5.7 Reference Manual: INNODB_LOCK_WAITS table — https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-lock-waits-table.html
- MySQL 8.0 Reference Manual: data_lock_waits table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: INNODB_TRX table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: threads table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: innodb_lock_wait_timeout — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout
- MySQL 8.0 Reference Manual: SHOW ENGINE INNODB STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html

## Issues Found
No technical issues found.

## Review Notes
- The join between `data_lock_waits.REQUESTING_ENGINE_TRANSACTION_ID` (BIGINT UNSIGNED) and `INNODB_TRX.TRX_ID` (VARCHAR(18)) relies on implicit type conversion. This works correctly in practice and is the standard pattern, but could be noted for readers who encounter type-mismatch warnings.
- `b_trx.TRX_QUERY` in the blocking chain query may return NULL when the blocking transaction is idle (not currently executing a statement). This is expected MySQL behavior, not a bug in the query, but readers should be aware.
- The `INFORMATION_SCHEMA.INNODB_LOCK_WAITS` table existed in MySQL 5.6 and earlier as well, not only 5.7. The post's framing of "MySQL 5.7" is acceptable since 5.7 was the last major version to include it before removal in 8.0.
