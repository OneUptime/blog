# Validation Summary: What Is a Record Lock in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- Performance Schema (`data_locks`, `data_lock_waits`)
- Information Schema (`innodb_trx`)
- SQL (DML, locking reads, transaction isolation levels)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: `performance_schema.data_locks` — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual: `performance_schema.data_lock_waits` — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: InnoDB Transaction Model and Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL 8.0 Reference Manual: Deadlock Detection — https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html
- MySQL 8.0 Migration Guide: Removed `INFORMATION_SCHEMA.INNODB_LOCK_WAITS` — https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html

## Issues Found
1. **Incorrect table and column names in lock waits query**: The query used `information_schema.innodb_lock_waits` with columns `blocking_trx_id` and `requesting_trx_id`. This table was removed in MySQL 8.0.1 and replaced by `performance_schema.data_lock_waits`. Since the preceding query in the same section already used `performance_schema.data_locks` (MySQL 8.0+), this was an inconsistency. Fixed by changing the table to `performance_schema.data_lock_waits` and updating the join columns to `BLOCKING_ENGINE_TRANSACTION_ID` and `REQUESTING_ENGINE_TRANSACTION_ID`.

## Review Notes
- The post simplifies InnoDB's clustered index fallback behavior: it states InnoDB creates a hidden rowid if no primary key is defined, but omits the intermediate step where InnoDB first looks for a suitable `UNIQUE NOT NULL` index before falling back to the hidden rowid. This is a simplification, not an error, and is acceptable for the scope of this article.
- All SQL syntax (`FOR SHARE`, `FOR UPDATE`, `SET SESSION TRANSACTION ISOLATION LEVEL`) is correct for MySQL 8.0+.
- The deadlock example, lock wait timeout details, and `SHOW ENGINE INNODB STATUS` output format are all accurate.
