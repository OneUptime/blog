# Validation Summary: How to Understand Intention Locks in MySQL InnoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- InnoDB locking mechanisms (intention locks, row locks, table locks)
- performance_schema.data_locks
- performance_schema.data_lock_waits
- information_schema.INNODB_TRX

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html#innodb-intention-locks
- MySQL 8.0 Reference Manual — data_locks table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — data_lock_waits table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual — INNODB_TRX table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual — SELECT ... FOR SHARE / LOCK IN SHARE MODE: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html

## Issues Found
1. **Incorrect lock-wait diagnostic query in "Intention Locks and LOCK TABLES" section**: The original query self-joined `information_schema.INNODB_TRX` with a condition `r.trx_id != b.trx_id`, which produces a cross product of all distinct transactions. This means every non-waiting transaction would falsely appear as a "blocker" of every waiting transaction when more than two transactions exist. Replaced with a query using `performance_schema.data_lock_waits`, which correctly identifies actual blocking relationships between transactions. This is also consistent with the rest of the post, which already uses `performance_schema.data_locks` (a MySQL 8.0+ table).

## Review Notes
- The post uses `LOCK IN SHARE MODE` syntax, which still works in MySQL 8.0+ but is the older form. The preferred MySQL 8.0+ syntax is `FOR SHARE`. This is not an error since the older syntax remains supported, but authors may wish to mention both forms.
- The compatibility matrix is accurate and matches the official MySQL documentation exactly.
- The practical examples correctly demonstrate IS/IX compatibility and IX/S conflict behavior.
- The `performance_schema.data_locks` query for viewing intention locks is correct for MySQL 8.0+. Note that in MySQL 5.7, the equivalent table was `information_schema.INNODB_LOCKS` (now removed in 8.0).
