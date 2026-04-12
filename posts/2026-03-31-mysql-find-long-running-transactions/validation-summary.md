# Validation Summary: How to Find Long-Running Transactions in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- `information_schema.INNODB_TRX`
- `information_schema.PROCESSLIST`
- `performance_schema.global_status`
- `performance_schema.events_transactions_current`
- `performance_schema.setup_instruments`

## Sources Consulted
- MySQL 8.0 Reference Manual — INNODB_TRX Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual — events_transactions_current Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-transactions-current-table.html
- MySQL 8.0 Reference Manual — Optimizer Hints (MAX_EXECUTION_TIME): https://dev.mysql.com/doc/refman/8.0/en/optimizer-hints.html
- MySQL 8.0 Reference Manual — Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — InnoDB Purge Configuration: https://dev.mysql.com/doc/refman/8.0/en/innodb-purge-configuration.html

## Issues Found

### 1. Non-existent column `SQL_TEXT` in Performance Schema query
**What was wrong:** The query against `performance_schema.events_transactions_current` included a `SQL_TEXT` column, which does not exist in that table. The `SQL_TEXT` column exists in `events_statements_current`, not `events_transactions_current`. The actual columns of the transactions table include `THREAD_ID`, `EVENT_NAME`, `STATE`, `TIMER_WAIT`, `ACCESS_MODE`, `ISOLATION_LEVEL`, `AUTOCOMMIT`, etc.
**What was changed:** Replaced `SQL_TEXT` with `ACCESS_MODE`, `ISOLATION_LEVEL`, and `AUTOCOMMIT` — columns that actually exist on the table and provide useful transaction-level context.

### 2. Misleading comment in read-only transactions section
**What was wrong:** The SQL comment said "Include transactions in any state" but the query filtered `WHERE trx_state = 'RUNNING'`, which contradicts the comment.
**What was changed:** Updated the comment to "Find transactions currently running for over 60 seconds" to accurately reflect the query's behavior.

### 3. Inaccurate description of MAX_EXECUTION_TIME scope
**What was wrong:** The comment said "Set a maximum execution time for individual statements" but `MAX_EXECUTION_TIME` only applies to read-only SELECT statements, not to INSERT, UPDATE, DELETE, or other DML.
**What was changed:** Updated the comment to "Set a maximum execution time for read-only SELECT statements" to be precise.

## Review Notes
- The `KILL CONNECTION <thread_id>` syntax uses angle brackets as a placeholder, which is the standard convention and is clear in context.
- The `SHOW ENGINE INNODB STATUS\G` command uses `\G` which is a mysql client directive (vertical output format), not standard SQL — this is appropriate for the context since readers would be running this interactively.
- The `wait_timeout` and `interactive_timeout` settings prevent idle connection buildup but do not directly limit transaction duration for actively running queries. This is a valid approach mentioned in the post but readers should be aware of the distinction.
- The post correctly notes that even read-only transactions with MVCC snapshots prevent undo log purge, which is an important and often overlooked point.
