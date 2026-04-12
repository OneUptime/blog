# Validation Summary: How to Configure Transaction Size Limits in MySQL Group Replication

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL Group Replication
- `group_replication_transaction_size_limit` system variable
- MySQL stored procedures (REPEAT...UNTIL loop)
- `information_schema.innodb_trx` table
- Python `mysql.connector` library
- MySQL binary log (`mysqlbinlog`)

## Sources Consulted
- MySQL 8.0 Reference Manual: `group_replication_transaction_size_limit` system variable (https://dev.mysql.com/doc/refman/8.0/en/group-replication-system-variables.html)
- MySQL 8.0 Reference Manual: `INFORMATION_SCHEMA.INNODB_TRX` table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html)
- MySQL 8.0 Reference Manual: `ROW_COUNT()` function (https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count)
- MySQL 8.0 Reference Manual: REPEAT statement (https://dev.mysql.com/doc/refman/8.0/en/repeat.html)
- MySQL 8.0 Error Reference: Error 3100 ER_RUN_HOOK_ERROR (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
- MySQL 8.0 Reference Manual: Group Replication Limitations (https://dev.mysql.com/doc/refman/8.0/en/group-replication-limitations.html)

## Issues Found

### 1. Inaccurate default value description (lines 34, 142)
- **What was wrong:** The post stated "The default is 150 MB." The actual default is 150,000,000 bytes, which is approximately 143 MB (MiB), not 150 MB. The MySQL documentation explicitly says "approximately 143 MB."
- **What was changed:** Updated to "approximately 143 MB (150,000,000 bytes)" in both occurrences.

### 2. Incorrect "Performance Schema" label (before the innodb_trx query)
- **What was wrong:** The text said "Or use the Performance Schema:" but the query targets `information_schema.innodb_trx`, which is part of the Information Schema, not the Performance Schema.
- **What was changed:** Changed to "Or query active transactions in the Information Schema:"

### 3. Misleading "broadcast phase" description (line 54)
- **What was wrong:** The post said transactions are "rejected during the broadcast phase." Per MySQL docs, the transaction size check occurs in the `before_commit` hook, and transactions exceeding the limit are rejected *before* being broadcast to the group — they are never sent to GCS.
- **What was changed:** Changed to "rejected before being broadcast to the group."

### 4. SQL REPEAT loop had multiple bugs (lines 98-105)
- **What was wrong:** Three issues: (a) `REPEAT...UNTIL` is only valid inside stored programs (stored procedures, functions, etc.) — it cannot run as standalone SQL; (b) `SELECT SLEEP(0.01)` overwrites `ROW_COUNT()` with -1 (since SELECT returns a result set), making the `UNTIL ROW_COUNT() = 0` condition never true, causing an infinite loop; (c) `SELECT SLEEP()` produces unnecessary result sets each iteration.
- **What was changed:** Wrapped the loop in a proper stored procedure with `DELIMITER`, saved `ROW_COUNT()` into a variable immediately after the UPDATE (before the SLEEP), and used `DO SLEEP(0.01)` instead of `SELECT SLEEP(0.01)`.

## Review Notes
- The `mysqlbinlog` command is placed inside a SQL code block as a comment — this is somewhat confusing since it's a shell command, but it is properly noted with "run from shell" in the comment text.
- The Python example correctly uses `cursor.rowcount` after the UPDATE and `conn.commit()`, and is not affected by the ROW_COUNT() bug in the SQL example.
- The error code 3100 (ER_RUN_HOOK_ERROR) and message format are accurate per MySQL error reference.
- The variable name, SET GLOBAL syntax, my.cnf persistence, and value ranges are all correct.
