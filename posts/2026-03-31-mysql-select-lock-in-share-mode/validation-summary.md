# Validation Summary: How to Use SELECT ... LOCK IN SHARE MODE in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL locking reads (LOCK IN SHARE MODE, FOR SHARE)
- MySQL Performance Schema (data_locks table)
- MySQL transaction isolation and concurrency control

## Sources Consulted
- MySQL 8.0 Reference Manual: Locking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: SELECT Statement — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: The data_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html

## Issues Found
- **"Converting to Exclusive Lock" section — misleading opening sentence**: The original text stated "you must release the lock and re-acquire it as an exclusive lock," implying that lock upgrade is impossible within the same transaction. This is incorrect. MySQL will attempt to upgrade an S lock to an X lock in-place when the same session issues an UPDATE. The upgrade succeeds if no other session holds a conflicting shared lock on the row. If another session does hold an S lock, a deadlock occurs. The code example's own comments already acknowledged this nuance, contradicting the opening sentence. Fixed the introductory sentence to accurately describe the lock upgrade behavior.

## Review Notes
- The `performance_schema.data_locks` table used in the "Checking Shared Locks" section is only available in MySQL 8.0+. In earlier versions, the equivalent table was `INFORMATION_SCHEMA.INNODB_LOCKS`. The post does not note this distinction, but since the query is presented as a utility snippet rather than a core part of the tutorial, this is acceptable.
- The claim "available since MySQL 5" is technically true but imprecise — `LOCK IN SHARE MODE` has been available since InnoDB was first introduced in MySQL 3.23. This is a minor imprecision that does not affect the tutorial's correctness.
- The post correctly recommends `FOR SHARE` over `LOCK IN SHARE MODE` for MySQL 8.0+ code, which aligns with current MySQL documentation guidance.
