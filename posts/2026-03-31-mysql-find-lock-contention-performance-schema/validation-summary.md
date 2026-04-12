# Validation Summary: How to Find Lock Contention Using Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Performance Schema (data_locks, data_lock_waits, events_waits_current, metadata_locks, setup_instruments, setup_consumers)
- MySQL InnoDB (information_schema.INNODB_TRX)
- MySQL sys schema (innodb_lock_waits, schema_table_lock_waits)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB INFORMATION_SCHEMA Transaction and Locking Information — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-transactions.html
- MySQL 8.0 Reference Manual: The data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: The data_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual: The events_waits_current Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-waits-current-table.html
- MySQL 8.0 Reference Manual: The INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: The metadata_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-metadata-locks-table.html
- MySQL 8.0 Reference Manual: Performance Schema Setup Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-tables.html
- MySQL 8.0 Reference Manual: The sys Schema innodb_lock_waits View — https://dev.mysql.com/doc/refman/8.0/en/sys-innodb-lock-waits.html

## Issues Found

1. **Incorrect join in "Finding Currently Blocked Queries" query**: The original query joined `information_schema.INNODB_TRX` to itself using `b.trx_id = r.trx_wait_started`. This is wrong because `trx_wait_started` is a DATETIME column (the timestamp when the transaction began waiting for a lock), not a transaction ID. There is no column in `INNODB_TRX` that directly links a waiting transaction to its blocker. Fixed by rewriting the query to use `performance_schema.data_lock_waits` as the bridge table, joining on `REQUESTING_ENGINE_TRANSACTION_ID` and `BLOCKING_ENGINE_TRANSACTION_ID` to correctly associate waiting and blocking transactions.

2. **Invalid column name `WAIT_SOURCE` in "Checking Wait Events" query**: The `events_waits_current` table does not have a column named `WAIT_SOURCE`. The correct column name is `SOURCE`, which contains the source file name and line number where the instrumented event was produced. Changed `e.WAIT_SOURCE` to `e.SOURCE`.

## Review Notes
- The TIMER_WAIT unit handling is correct: Performance Schema timers are in picoseconds, so dividing by 1,000,000,000 correctly yields milliseconds, and the threshold of 1,000,000,000 picoseconds correctly represents 1ms.
- The `sys.innodb_lock_waits` view and `sys.schema_table_lock_waits` view are both valid MySQL 8.0 sys schema views.
- The metadata_locks query correctly joins on `OWNER_THREAD_ID` to `threads.THREAD_ID` and filters for `LOCK_STATUS = 'GRANTED'`.
- The post is MySQL 8.0-specific (uses `data_locks`/`data_lock_waits` which replaced the deprecated `INNODB_LOCKS`/`INNODB_LOCK_WAITS` from MySQL 5.x). This is not mentioned explicitly but is implied by the section title. The post would benefit from a brief note that these tables are MySQL 8.0+, but this is a minor observation, not an error.
