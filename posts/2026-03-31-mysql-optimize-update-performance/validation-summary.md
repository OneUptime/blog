# Validation Summary: How to Optimize UPDATE Performance in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (UPDATE, EXPLAIN, CREATE INDEX, SHOW INDEX, SHOW ENGINE INNODB STATUS)
- Python (MySQL database connector usage for batched updates)
- information_schema system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: EXPLAIN Statement — https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: UPDATE Statement — https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: InnoDB Redo Log — https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: SHOW ENGINE INNODB STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: Multi-Table UPDATE Syntax — https://dev.mysql.com/doc/refman/8.0/en/update.html
- PEP 249 (Python DB-API 2.0) cursor.rowcount specification

## Issues Found
1. **Missing `connection.commit()` in Python batching code.** The Python example for batched updates was missing a `connection.commit()` call after each batch iteration. Without committing between batches, all updated rows remain locked within a single transaction, completely defeating the stated purpose of batching (reducing lock hold time). Most Python MySQL connectors (mysql-connector-python, PyMySQL) default to `autocommit=False`, so an explicit commit is required. Added `connection.commit()` after each `cursor.execute()` call.

## Review Notes
- The "Flush the redo log" item in the "Why UPDATE Can Be Slow" list is a slight simplification. Technically, InnoDB writes to the redo log buffer during the UPDATE and flushes to disk at commit time (controlled by `innodb_flush_log_at_trx_commit`). This is acceptable for a high-level overview.
- `EXPLAIN UPDATE` syntax is valid in MySQL 5.6.3+. The post does not specify a MySQL version but the content is compatible with MySQL 5.7 and 8.0.
- The `information_schema.INNODB_TRX.trx_rows_locked` column is confirmed valid in MySQL 5.7 and 8.0.
- InnoDB's change buffering can defer some secondary index updates, but the post's claim that secondary indexes "must also be updated" is correct at a high level since the updates still need to happen eventually.
- All SQL syntax (multi-table UPDATE with JOIN, UPDATE...LIMIT, SHOW INDEX, SHOW ENGINE INNODB STATUS) is valid MySQL syntax.
