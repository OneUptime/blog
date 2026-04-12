# Validation Summary: How to Understand Auto-Increment Locks in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- AUTO_INCREMENT locking mechanisms
- Binary logging (row-based and statement-based replication)
- performance_schema

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB AUTO_INCREMENT Handling: https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual — innodb_autoinc_lock_mode variable documentation
- MySQL 8.0 Reference Manual — Binary Logging Options (binlog_format default)

## Issues Found
1. **Incorrect definition of "simple inserts" in Mode 1 description**: The post described simple inserts as "(single-row)", but per MySQL documentation, "simple inserts" are defined as statements where the number of rows to be inserted can be determined in advance. This includes both single-row and multi-row `INSERT VALUES` statements (e.g., `INSERT INTO t VALUES (a), (b), (c)`), not just single-row inserts. The distinguishing factor is whether the row count is determinable at parse time, not whether it is a single row. Fixed the parenthetical to accurately reflect the MySQL documentation definition.

## Review Notes
- The post correctly identifies all three lock modes and their behavior.
- The explanation of why MySQL 8.0 changed the default to mode 2 (due to row-based binary logging becoming the default) is accurate.
- The performance_schema query for checking auto-increment mutex contention is valid.
- The note about `ALTER TABLE ... AUTO_INCREMENT = 1` not going below `MAX(id) + 1` is correct for InnoDB.
- The performance considerations section mentions using mode 1 for "workloads that rely on consecutive IDs (e.g., ticket systems where gaps are unacceptable)." It's worth noting that no auto-increment mode guarantees gap-free IDs — gaps can still occur from rolled-back transactions, DELETE operations, etc. The modes only control whether IDs within concurrent bulk inserts are interleaved. This is not strictly wrong but could be clearer.
