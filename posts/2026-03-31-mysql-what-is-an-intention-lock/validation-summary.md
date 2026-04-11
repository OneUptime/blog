# Validation Summary: What Is an Intention Lock in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB intention locks (IS, IX)
- InnoDB table-level and row-level locking
- Performance Schema (`data_locks`, `data_lock_waits`)
- `INFORMATION_SCHEMA.INNODB_TRX`

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html#innodb-intention-locks
- MySQL 8.0 Reference Manual — data_lock_waits table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — data_locks table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Migration Guide — Removed INFORMATION_SCHEMA tables: https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html

## Issues Found
1. **Outdated `information_schema.innodb_lock_waits` query**: The first SQL query in the "Viewing Intention Locks" section used `information_schema.innodb_lock_waits` with columns `blocking_trx_id` and `requesting_trx_id`. This table was removed in MySQL 8.0 (it only existed in MySQL 5.7 and earlier). Updated the query to use `performance_schema.data_lock_waits` with the correct MySQL 8.0+ column names `BLOCKING_ENGINE_TRANSACTION_ID` and `REQUESTING_ENGINE_TRANSACTION_ID`. The join to `information_schema.innodb_trx` was preserved as that table still exists in MySQL 8.0+. This also resolved an inconsistency where the first query used MySQL 5.7 syntax while the second query already correctly used `performance_schema.data_locks` (MySQL 8.0+).

## Review Notes
- The lock compatibility matrix is accurate and matches the official MySQL documentation.
- The explanation of IS/IX lock semantics and their purpose is correct.
- The practical example correctly demonstrates that IX locks are compatible with each other, allowing concurrent row-level modifications on different rows.
- The claim that intention locks cannot be set manually is correct — they are automatically acquired by InnoDB.
- The post does not specify a MySQL version. All content is now consistent with MySQL 8.0+, which is the current GA release series.
