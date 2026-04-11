# Validation Summary: How to Write Safe ALTER TABLE Statements in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0 InnoDB
- Online DDL (ALGORITHM=INPLACE, ALGORITHM=INSTANT, ALGORITHM=COPY)
- pt-online-schema-change
- gh-ost
- performance_schema

## Sources Consulted
- MySQL 8.0 Reference Manual — Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual — ALTER TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual — Online DDL Performance and Concurrency: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-performance.html
- MySQL 8.0 Reference Manual — Server System Variables (lock_wait_timeout): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found

### Issue 1: ADD COLUMN NOT NULL without DEFAULT incorrectly labeled as OFFLINE
- **What was wrong:** The post labeled `ADD COLUMN score INT NOT NULL` (without a DEFAULT clause) as "OFFLINE (table copy, blocks writes)." According to MySQL 8.0 documentation, ADD COLUMN is an INPLACE operation that permits concurrent DML regardless of whether a DEFAULT is specified. MySQL uses the implicit type default (0 for INT) for existing rows. This operation does not require ALGORITHM=COPY and does not block writes.
- **What was changed:** Changed the comment from "OFFLINE" to "ONLINE (inplace)" and added `ALGORITHM=INPLACE, LOCK=NONE` to the SQL statement. Also updated the "Adding a NOT NULL Column Safely" section explanation to clarify that the operation is online even without a default, and that specifying an explicit default is recommended for clarity and application compatibility rather than to avoid an offline operation.

### Issue 2: Unique index incorrectly required LOCK=SHARED
- **What was wrong:** The post used `LOCK=SHARED` when adding a unique index. According to MySQL 8.0 documentation, adding a unique index (as a secondary index) supports `ALGORITHM=INPLACE, LOCK=NONE` with concurrent DML permitted. While `LOCK=SHARED` works, it is unnecessarily restrictive and the post implied it was required.
- **What was changed:** Changed `LOCK=SHARED` to `LOCK=NONE` in the unique index example.

### Issue 3: WAIT clause is MariaDB syntax, not valid MySQL
- **What was wrong:** The post used `WAIT 5` as part of the ALTER TABLE statement to set a metadata lock timeout. The `WAIT n` and `NOWAIT` syntax is a MariaDB extension and is not part of the MySQL ALTER TABLE syntax. MySQL would reject this with a syntax error.
- **What was changed:** Replaced the `WAIT 5` clause with `SET SESSION lock_wait_timeout = 5;` as a separate statement before the ALTER TABLE, which is the correct MySQL approach for controlling metadata lock wait time. Also added `ALGORITHM=INPLACE` to the ALTER statement for consistency with the rest of the post.

### Issue 4: Safe pattern explanation implied incorrect motivation
- **What was wrong:** The explanation "Add with a default first, then optionally remove the default later" implied that adding a NOT NULL column without a default was an offline/blocking operation, which is incorrect.
- **What was changed:** Updated the explanation to clarify that the operation is online regardless, and that the explicit default is recommended for clarity and application compatibility.

## Review Notes
- In MySQL 8.0.12+, ADD COLUMN at the end of a table can use ALGORITHM=INSTANT, which is even faster than INPLACE. The post could mention this in a future update, but it is not incorrect as-is since INPLACE is still valid.
- The performance_schema query for monitoring alter progress is correct and works in MySQL 5.7+.
- The advice to use pt-online-schema-change or gh-ost for large table COPY operations is sound and widely accepted best practice.
- The batching advice (grouping multiple changes in one ALTER TABLE) is correct and reduces overhead.
