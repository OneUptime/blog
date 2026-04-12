# Validation Summary: How to Handle Deadlocks in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- MySQL Performance Schema (`data_lock_waits`, `data_locks`)
- MySQL stored procedures (DECLARE HANDLER, LOOP, SIGNAL)
- SQL transactions and locking (SELECT FOR UPDATE, exclusive locks, gap locks)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Deadlock Detection: https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html
- MySQL 8.0 Reference Manual — How to Minimize and Handle Deadlocks: https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks-handling.html
- MySQL 8.0 Reference Manual — The data_lock_waits Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — The data_locks Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — Server Error Reference (Error 1213, SQLSTATE 40001): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0 Reference Manual — InnoDB Startup Options and System Variables (innodb_print_all_deadlocks): https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — InnoDB Transaction Isolation Levels: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual — START TRANSACTION, COMMIT, and ROLLBACK: https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual — DECLARE ... HANDLER Statement (scope rules): https://dev.mysql.com/doc/refman/8.0/en/handler-scope.html

## Issues Found

### Issue 1: Misleading section title "Performance Schema: Recent Deadlock Data"
- **What was wrong:** The section title implied that `performance_schema.data_lock_waits` and `performance_schema.data_locks` contain historical deadlock information. In reality, these tables show only live/current lock waits and currently held locks. Once a lock wait is resolved (or a transaction rolls back after a deadlock), the rows disappear. They do not store any historical deadlock data.
- **What was changed:** Renamed the section from "Performance Schema: Recent Deadlock Data" to "Performance Schema: Monitor Lock Waits" to accurately describe what these tables provide.
- **Why:** Readers could be misled into expecting to find past deadlock events in these tables, when in fact only `SHOW ENGINE INNODB STATUS` and `innodb_print_all_deadlocks` logging capture deadlock history.

### Issue 2: CONTINUE HANDLER in retry pseudocode causes partial updates
- **What was wrong:** The application-level retry example used `DECLARE CONTINUE HANDLER FOR SQLSTATE '40001'`. With a CONTINUE handler, when a deadlock occurs on the first UPDATE statement, InnoDB automatically rolls back the entire transaction and autocommit reverts to ON. The CONTINUE handler then allows execution to proceed to the second UPDATE, which now executes and auto-commits outside any transaction — resulting in a partial update (only the credit applied, not the debit).
- **What was changed:** Changed `DECLARE CONTINUE HANDLER` to `DECLARE EXIT HANDLER` and added an explicit `ROLLBACK` in the handler body. An EXIT handler terminates execution of the enclosing BEGIN...END block, preventing subsequent statements from executing after the deadlock. The loop then checks the flag and retries the entire transaction.
- **Why:** The original code could cause data corruption (partial balance update) if used as a template. This is a critical correctness issue in a blog post about transaction safety.

## Review Notes
- The InnoDB victim selection heuristic is described as "typically the one that has done the least work." Per MySQL docs, the metric is specifically the number of rows inserted, updated, or deleted. The colloquial phrasing is acceptable but not precise.
- The "Keep Transactions Short" example comments that a plain SELECT "May hold shared locks." At the default REPEATABLE READ isolation level, InnoDB uses consistent (non-locking) reads for plain SELECTs. Shared locks would only apply at SERIALIZABLE isolation. The "May" qualifier makes this technically defensible but could be clearer.
- The `performance_schema.data_lock_waits` and `data_locks` tables are MySQL 8.0+ only. The post doesn't specify a minimum MySQL version, which could cause confusion for users on MySQL 5.7.
