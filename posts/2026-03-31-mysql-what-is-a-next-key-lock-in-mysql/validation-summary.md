# Validation Summary: What Is a Next-Key Lock in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB locking mechanisms (record locks, gap locks, next-key locks)
- REPEATABLE READ and READ COMMITTED isolation levels
- Performance Schema (`data_locks` table)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: Locks Set by Different SQL Statements in InnoDB — https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html
- MySQL 8.0 Reference Manual: Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: The data_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html

## Issues Found
No technical issues found.

## Review Notes
- The `(40, +infinity)` notation in the next-key range example is a standard pedagogical simplification. Technically, InnoDB uses a "supremum" pseudo-record, so the range is `(40, supremum]`. This simplification is widely used in MySQL literature and is appropriate for this level of explanation.
- The word "Possibly" in "Possibly a gap lock on `(200.00, 300.00)`" is slightly imprecise — InnoDB will always scan past the last matching record on a non-unique index and place a gap lock there. However, this does not rise to the level of a technical error since the locking behavior can vary with internal optimizations.
- The `performance_schema.data_locks` table referenced is available in MySQL 8.0+. Users on MySQL 5.7 would need to use `INFORMATION_SCHEMA.INNODB_LOCKS` instead. The post does not specify a MySQL version, but the approach is current and correct for modern MySQL.
