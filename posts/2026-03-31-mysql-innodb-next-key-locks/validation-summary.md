# Validation Summary: How to Understand Next-Key Locks in MySQL InnoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL InnoDB storage engine
- InnoDB locking mechanisms (record locks, gap locks, next-key locks)
- performance_schema.data_locks
- MySQL transaction isolation levels (REPEATABLE READ, READ COMMITTED)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — Locks Set by Different SQL Statements in InnoDB: https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html
- MySQL 8.0 Reference Manual — The data_locks Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — Transaction Isolation Levels: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html

## Issues Found

1. **Incorrect `performance_schema.data_locks` comment (line 56)**: The comment stated that a next-key lock shows as `X,REC_NOT_GAP` for the record and `X,GAP` for the preceding gap. This is incorrect — a next-key lock appears as a single entry with LOCK_MODE=`X` (no suffix). `X,REC_NOT_GAP` is a record-only lock, and `X,GAP` is a gap-only lock. The actual output for `SELECT ... WHERE value = 20 FOR UPDATE` on a secondary index shows: `X` (next-key lock on the secondary index entry), `X,GAP` (gap lock on the next record after the match), and `X,REC_NOT_GAP` (record lock on the corresponding primary key entry). Fixed the comment to accurately describe these lock modes.

2. **Incorrect blocked range for BETWEEN query (line 68)**: The post stated that the BETWEEN 10 AND 30 query "blocks any insert with a value in the range negative infinity to 30." However, the query also acquires a gap lock on `(30, +infinity)`, which means inserts with values greater than 30 are also blocked. The entire index range is effectively locked. Fixed to state that all inserts into the index are blocked.

## Review Notes
- The post correctly describes the fundamental next-key lock concept and its role in preventing phantom reads under REPEATABLE READ.
- The next-key lock intervals notation is consistent with the MySQL documentation's convention (round brackets for exclusive, square brackets for inclusive).
- The deadlock scenario description is conceptually sound, though it is presented as a comment-only example without runnable SQL. This is acceptable for illustrative purposes.
- The post does not mention that for a secondary index exact-match scan (`WHERE value = 20 FOR UPDATE`), InnoDB also acquires a gap lock on the gap after the matched record (i.e., `(20, 30)`), in addition to the next-key lock on the matched record. This is a simplification that could lead to surprises in practice, but it does not constitute an outright error since the post is focused on explaining what a next-key lock is, not the full set of locks acquired by a given query.
