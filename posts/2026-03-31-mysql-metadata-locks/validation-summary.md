# Validation Summary: How to Understand Metadata Locks in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- MySQL Metadata Locks (MDL)
- Performance Schema (metadata_locks, threads tables)
- DDL/DML concurrency control

## Sources Consulted
- MySQL 8.0 Reference Manual: Metadata Locking — https://dev.mysql.com/doc/refman/8.0/en/metadata-locking.html
- MySQL 8.0 Reference Manual: The metadata_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-metadata-locks-table.html
- MySQL 8.0 Reference Manual: The threads Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- MySQL 8.0 Reference Manual: The events_statements_current Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-statements-current-table.html
- MySQL 8.0 Reference Manual: LOCK TABLES and UNLOCK TABLES — https://dev.mysql.com/doc/refman/8.0/en/lock-tables.html
- MySQL 8.0 Server Error Reference — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found

### 1. Incorrect description of SHARED MDL mode
- **What was wrong:** The SHARED mode was described as "Acquired by most DML (SELECT, INSERT, UPDATE)". In reality, SELECT acquires SHARED_READ and INSERT/UPDATE/DELETE acquire SHARED_WRITE. The plain SHARED mode is a basic lock used by statements like HANDLER ... OPEN.
- **What was changed:** Updated the description to "Basic shared lock (HANDLER statements)" and corrected the SHARED_READ and SHARED_WRITE descriptions to accurately reflect their usage by SELECT and INSERT/UPDATE/DELETE respectively.

### 2. Incorrect description of SHARED_NO_READ_WRITE mode
- **What was wrong:** SHARED_NO_READ_WRITE was described as being used by "FLUSH TABLES". It is actually acquired by LOCK TABLES ... WRITE. FLUSH TABLES WITH READ LOCK uses a different lock type (SHARED at the global level).
- **What was changed:** Updated the description to "LOCK TABLES ... WRITE".

### 3. Broken MDL monitoring query
- **What was wrong:** The query had multiple errors: (a) it referenced table alias `b` which was never defined in the FROM/JOIN clause, (b) it used columns `PROCESSLIST_ID` and `PROCESSLIST_TIME` from `events_statements_current` which does not have those columns (they exist in `performance_schema.threads`), and (c) the query only joined pending locks without a self-join to find the granted (blocking) locks.
- **What was changed:** Replaced the query with a correct version that self-joins `metadata_locks` (once for PENDING waiters, once for GRANTED blockers on the same object) and joins to `performance_schema.threads` for process information including PROCESSLIST_ID, PROCESSLIST_INFO, and PROCESSLIST_TIME.

### 4. Unnecessary Performance Schema consumer setup
- **What was wrong:** The setup section included enabling the `events_statements_current` consumer, which is not needed for MDL monitoring via the `metadata_locks` and `threads` tables.
- **What was changed:** Removed the `UPDATE performance_schema.setup_consumers` statement since the corrected query uses `metadata_locks` and `threads` tables, not `events_statements_current`.

## Review Notes
- The `sys.schema_table_lock_waits` view (available in MySQL 8.0 with the sys schema) provides an easier alternative for finding MDL blockers, but the manual query approach shown in the post is a valid and educational approach.
- The error code 1205 for `lock_wait_timeout` is technically correct — both MDL timeouts and InnoDB row lock timeouts produce the same error code. The post could note this distinction in the future but it is not incorrect as written.
- The cascading blocking scenario (Session 3 being blocked by Session 2's pending EXCLUSIVE request) is correctly described and is one of the most important concepts for readers to understand.
