# Validation Summary: How to Handle MySQL Deadlocks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MySQL
- InnoDB
- SQL transactions and locking
- MySQL Performance Schema
- MySQL Connector/Python
- Python retry logic

## Sources Consulted
- MySQL 8.4 Reference Manual: An InnoDB Deadlock Example - https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-example.html
- MySQL 8.4 Reference Manual: How to Minimize and Handle Deadlocks - https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlocks-handling.html
- MySQL 8.4 Reference Manual: InnoDB Locking - https://dev.mysql.com/doc/refman/8.4/en/innodb-locking.html
- MySQL 8.4 Reference Manual: Transaction Isolation Levels - https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html
- MySQL 8.4 Reference Manual: InnoDB Transaction Model - https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-model.html
- MySQL 8.4 Reference Manual: The data_lock_waits Table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html
- MySQL 8.4 Reference Manual: Server Status Variable Reference - https://dev.mysql.com/doc/refman/8.4/en/server-status-variable-reference.html
- MySQL 9.3 Reference Manual: InnoDB INFORMATION_SCHEMA Metrics Table - https://dev.mysql.com/doc/refman/9.3/en/innodb-information-schema-metrics-table.html
- MySQL Connector/Python Developer Guide: errors.Error Exception - https://dev.mysql.com/doc/connector-python/en/connector-python-api-errors-error.html

## Issues Found
- The introduction implied InnoDB deadlock detection is unconditional. Updated it to say detection is automatic by default, because MySQL exposes `innodb_deadlock_detect` and behavior can be changed.
- The detection section claimed deadlocks are resolved within milliseconds. Softened this to "usually resolved quickly" because the official documentation describes automatic detection and rollback but does not guarantee a millisecond timing bound.
- The gap-lock scenario showed Transaction A inserting into a gap it already locked and labeled that alone as a deadlock. Updated the example to describe next-key locks and blocking accurately, and to note that the wait becomes a deadlock only when it participates in a larger circular wait.
- The "Secondary Index Lock Escalation" heading used inaccurate terminology. InnoDB uses row-level locking without lock escalation, so the heading and explanation were changed to "Secondary Index Locks."
- The secondary-index example claimed overlapping index pages can cause deadlocks. Updated it to focus on overlapping rows or index entries accessed in different orders.
- The Python retry example closed `cursor` unconditionally in `finally`. Added `cursor = None` and a guard before `cursor.close()` so the snippet remains safe if cursor creation fails.
- The covering-index section said no primary key lock is needed for reads. Clarified that this only applies to non-locking read overhead, and added a note that locking reads such as `SELECT ... FOR UPDATE` still lock rows and associated index entries.
- The monitoring section listed `Innodb_deadlocks`, which is not a MySQL 8.4 global status variable. Replaced it with the `lock_deadlocks` counter from `INFORMATION_SCHEMA.INNODB_METRICS`.
- The current lock-wait query joined `events_waits_current` rows by `OBJECT_INSTANCE_BEGIN`, which is not the correct way to inspect InnoDB row lock waits. Replaced it with a `performance_schema.data_lock_waits` and `performance_schema.data_locks` query.

## Review Notes
The post is generally accurate after these corrections. Future improvements could mention that `READ COMMITTED` still uses gap locks for foreign-key constraint checks and duplicate-key checks, and that deadlock retry logic should be applied only to idempotent transaction units or operations that can be safely retried.
