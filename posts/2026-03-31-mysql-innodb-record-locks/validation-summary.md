# Validation Summary: How to Understand Record Locks in MySQL InnoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- InnoDB record locks, gap locks, next-key locks
- performance_schema.data_locks

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — data_locks Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — InnoDB Transaction Model: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html

## Issues Found
1. **Incorrect LOCK_MODE descriptions for `X` and `S`**: The post described `X` as "exclusive record lock" and `S` as "shared record lock." In MySQL's `performance_schema.data_locks` table, when `LOCK_TYPE = 'RECORD'`, a `LOCK_MODE` of `X` or `S` alone actually represents a **next-key lock** (record + gap before it), not a pure record lock. Pure record locks are indicated by `X,REC_NOT_GAP` and `S,REC_NOT_GAP`. Updated the descriptions to correctly label `X` as "exclusive next-key lock (record + gap)" and `S` as "shared next-key lock (record + gap)."

## Review Notes
- The post uses `LOCK IN SHARE MODE`, which still works in MySQL 8.0+ but `FOR SHARE` is the preferred modern syntax introduced in MySQL 8.0. Both are valid; this is not an error.
- The post's explanations about record lock behavior on primary keys vs. unique indexes vs. non-unique indexes apply under the default REPEATABLE READ isolation level. Under READ COMMITTED, locking behavior differs (e.g., gap locks are not used). The post doesn't specify the isolation level, but the described behavior is correct for the default.
- The note that unique index exact-match lookups produce pure record locks assumes the queried row exists. If the row doesn't exist, InnoDB may use a gap lock instead, even on a unique index. This edge case is not mentioned but is an acceptable simplification for an introductory article.
