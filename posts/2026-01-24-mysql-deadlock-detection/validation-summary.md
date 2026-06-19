# Validation Summary: How to Handle Deadlock Detection in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- MySQL
- InnoDB
- SQL transactions and locking
- MySQL configuration files
- MySQL Connector/Python
- Python retry logic

## Sources Consulted
- MySQL 8.4 Reference Manual: Deadlock Detection - https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html
- MySQL 8.4 Reference Manual: An InnoDB Deadlock Example - https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-example.html
- MySQL 8.4 Reference Manual: Transaction Isolation Levels - https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html
- MySQL 8.4 Reference Manual: Locking Reads - https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html
- MySQL Reference Manual: Locks Set by Different SQL Statements in InnoDB - https://dev.mysql.com/doc/refman/9.1/en/innodb-locks-set.html
- MySQL 8.4 Reference Manual: Restrictions on Subqueries - https://dev.mysql.com/doc/refman/8.4/en/subquery-restrictions.html
- MySQL Connector/Python Developer Guide: errors.Error Exception - https://dev.mysql.com/doc/connector-python/en/connector-python-api-errors-error.html
- MySQL Error Reference: ER_LOCK_DEADLOCK - https://dev.mysql.com/doc/mysql-errors/5.7/en/server-error-reference.html

## Issues Found
- The stored procedure in the batching example used `WHERE product_id IN (SELECT product_id FROM pending_orders LIMIT batch_size)`. MySQL does not support `LIMIT` in subqueries used with `IN`, so the example could fail with error 1235. I changed it to materialize each batch into a temporary table and join against that table.
- The same batching example did not remove or mark processed `pending_orders` rows, so it could repeatedly process the same batch. I added a delete of processed pending rows within the transaction so the loop can terminate.

## Review Notes
The rest of the post aligns with the official MySQL documentation: InnoDB deadlock detection is enabled by default, `SHOW ENGINE INNODB STATUS` reports the latest detected deadlock, `innodb_print_all_deadlocks` logs all deadlocks to the error log, `INFORMATION_SCHEMA.INNODB_METRICS` exposes `lock_deadlocks`, and `READ COMMITTED` can reduce deadlock probability by reducing gap locking and releasing nonmatching row locks earlier. The isolation-level diagram is simplified and should be treated as conceptual rather than a complete concurrency model.
