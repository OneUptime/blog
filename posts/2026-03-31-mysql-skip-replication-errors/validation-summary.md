# Validation Summary: How to Skip Replication Errors in MySQL

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MySQL 8.0 (specifically 8.0.26+ based on `REPLICA` terminology used throughout)
- MySQL GTID-based replication
- MySQL position-based replication
- Percona Toolkit (pt-table-checksum, pt-table-sync)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual: GTID-based replication — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-howto.html
- MySQL 8.0 Reference Manual: sql_replica_skip_counter system variable — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html#sysvar_sql_replica_skip_counter
- MySQL 8.0 Reference Manual: replica_skip_errors system variable — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html#sysvar_replica_skip_errors
- MySQL 8.0 Reference Manual: SET GTID_NEXT — https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-concepts.html
- MySQL 8.0.26 Release Notes (SLAVE to REPLICA terminology changes) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html
- Percona Toolkit documentation for pt-table-checksum and pt-table-sync — https://docs.percona.com/percona-toolkit/

## Issues Found

### 1. Non-existent `Executing_Gtid` field in SHOW REPLICA STATUS output
**What was wrong:** The example output for `SHOW REPLICA STATUS\G` included a field called `Executing_Gtid`, which does not exist in MySQL's `SHOW REPLICA STATUS` output. The actual GTID-related fields are `Retrieved_Gtid_Set` and `Executed_Gtid_Set`.
**What was changed:** Replaced `Executing_Gtid: 3E11FA47-71CA-11E1-9E33-C80AA9429562:55` with the real fields `Retrieved_Gtid_Set: 3E11FA47-71CA-11E1-9E33-C80AA9429562:1-55` and `Executed_Gtid_Set: 3E11FA47-71CA-11E1-9E33-C80AA9429562:1-54`. Updated the Method 1 comment to explain that the failing GTID is derived from the difference between these two sets.
**Why:** A reader following this guide would look for the `Executing_Gtid` field and not find it, causing confusion. The correct approach is to compare `Retrieved_Gtid_Set` and `Executed_Gtid_Set` to identify the failing transaction.

### 2. Incorrect variable name `SQL_SKIP_COUNTER` in text
**What was wrong:** The introductory text for Method 2 referred to the variable as `SQL_SKIP_COUNTER`, which is not the actual MySQL system variable name.
**What was changed:** Updated to `sql_replica_skip_counter`, the correct variable name in MySQL 8.0.26+.
**Why:** The variable name was shortened incorrectly and wouldn't match what a reader finds in MySQL documentation.

### 3. Deprecated `SQL_SLAVE_SKIP_COUNTER` variable name
**What was wrong:** The code examples and summary used `SQL_SLAVE_SKIP_COUNTER`, which is the deprecated name (deprecated in MySQL 8.0.26). The rest of the post consistently uses the modern `REPLICA` terminology (`SHOW REPLICA STATUS`, `STOP REPLICA`, `replica_skip_errors`).
**What was changed:** Updated all occurrences of `SQL_SLAVE_SKIP_COUNTER` to `sql_replica_skip_counter` in the code examples and summary text.
**Why:** For consistency with the rest of the post (which targets MySQL 8.0.26+) and to use the non-deprecated variable name. The old name still works but generates deprecation warnings.

## Review Notes
- The GTID skip procedure (Method 1) is technically correct and follows the standard documented approach.
- The `replica_skip_errors` configuration section correctly notes it requires a server restart (it is a read-only variable at runtime).
- The Percona Toolkit commands (`pt-table-checksum`, `pt-table-sync`) use correct syntax and options.
- The mermaid flowchart is syntactically valid and logically sound.
- The error codes table (1062, 1032, 1051, 1146) is accurate.
- The multi-source replication channel syntax is correct.
- The decision table for when to skip vs. fix is well-reasoned and technically sound.
- Note: `sql_replica_skip_counter` counts event groups (effectively transactions) rather than individual binary log events, so setting it to 1 skips the entire failing transaction. The post's usage is correct in practice.
