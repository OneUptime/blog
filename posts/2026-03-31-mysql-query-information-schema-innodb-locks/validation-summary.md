# Validation Summary: How to Query INFORMATION_SCHEMA.INNODB_LOCKS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 5.7 (INFORMATION_SCHEMA.INNODB_LOCKS)
- MySQL 8.0 (performance_schema.data_locks, performance_schema.data_lock_waits)
- InnoDB lock modes (S, X, IS, IX, GAP, REC_NOT_GAP, INSERT_INTENTION)

## Sources Consulted
- MySQL 5.7 Reference Manual — INNODB_LOCKS Table: https://dev.mysql.com/doc/refman/5.7/en/information-schema-innodb-locks-table.html
- MySQL 8.0 Reference Manual — data_locks Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — data_lock_waits Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html

## Issues Found

1. **Overview incorrectly described INNODB_LOCKS scope**: The post stated that `INFORMATION_SCHEMA.INNODB_LOCKS` "showed all locks being held or requested." Per the MySQL 5.7 documentation, this table only showed locks involved in lock-wait situations — locks requested but not yet acquired, and locks held that were blocking another transaction. It did not show all locks. Fixed the description to accurately reflect this limitation, and clarified that `performance_schema.data_locks` in MySQL 8.0 is the one that shows all locks (not just contended ones).

2. **Blocking Chain Analysis query was incorrect**: The original query self-joined `performance_schema.data_locks` on just `OBJECT_NAME` and lock status (`WAITING` / `GRANTED`). This would produce false positives by pairing every waiting lock on a table with every granted lock on that same table, even when they involve different rows or indexes with no actual blocking relationship. Replaced with the correct approach using `performance_schema.data_lock_waits`, which directly maps each waiting lock to its specific blocking lock via `ENGINE_LOCK_ID`.

## Review Notes
- The MySQL 5.7 `INNODB_LOCKS` column list is complete and correct (all 10 columns).
- The MySQL 8.0 `data_locks` column list is correct (subset of available columns, all valid).
- The lock mode reference table is accurate and covers the most common InnoDB lock modes.
- The threads join query and counting query are both correct.
- The Summary section correctly recommends combining `INNODB_TRX` and `data_lock_waits` for full contention analysis — both tables exist and are the right tools for this purpose.
