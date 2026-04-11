# Validation Summary: How to Configure InnoDB Undo Tablespace in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0
- InnoDB Storage Engine
- InnoDB Undo Tablespaces
- InnoDB Undo Log Truncation
- MVCC (Multi-Version Concurrency Control)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Undo Tablespaces: https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-tablespaces.html
- MySQL 8.0 Reference Manual — ALTER TABLESPACE Statement: https://dev.mysql.com/doc/refman/8.0/en/alter-tablespace.html
- MySQL 8.0 Reference Manual — CREATE TABLESPACE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-tablespace.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA INNODB_METRICS Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-metrics-table.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA INNODB_TRX Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.4 Reference Manual — ALTER TABLESPACE Statement: https://dev.mysql.com/doc/refman/8.4/en/alter-tablespace.html

## Issues Found

1. **Invalid ALTER UNDO TABLESPACE ... SET AUTOEXTEND_SIZE syntax**: The post used `ALTER UNDO TABLESPACE innodb_undo_001 SET AUTOEXTEND_SIZE = 67108864` which is not valid. `ALTER UNDO TABLESPACE` only supports `SET ACTIVE`, `SET INACTIVE`, and `ENCRYPTION`. `AUTOEXTEND_SIZE` can only be specified at creation time via `CREATE UNDO TABLESPACE`. Rewrote the section to show the correct `CREATE UNDO TABLESPACE ... AUTOEXTEND_SIZE` syntax instead.

2. **Incorrect "Performance Schema" label**: The comment said "Also available from Performance Schema" before querying `information_schema.INNODB_METRICS`. The `INNODB_METRICS` table is part of `information_schema`, not `performance_schema`. Changed to "Also available from Information Schema".

3. **Reversed state transition order in manual truncation comment**: The comment stated `STATE will show: empty -> inactive -> active (once truncated)`. The correct order during manual truncation is: `inactive` (after SET INACTIVE) -> `empty` (after purge/truncation completes) -> `active` (after SET ACTIVE). Fixed to `inactive -> empty -> active (once re-activated)`.

4. **State diagram DROP transition from wrong state**: The mermaid state diagram showed `Active --> DROP UNDO TABLESPACE (only when empty)`, implying DROP could be issued from Active state. An undo tablespace must be in Empty state before it can be dropped. Moved the DROP transition to originate from the Empty state.

## Review Notes
- The `innodb_undo_tablespaces` variable shown via `SHOW VARIABLES` is deprecated as of MySQL 8.0.14 and is no longer configurable. It still returns a value but new undo tablespaces should be managed with `CREATE UNDO TABLESPACE` / `DROP UNDO TABLESPACE` SQL statements. Not changed since the SHOW command still works, but worth noting for future updates.
- The default initial undo tablespace file size is 10 MB prior to MySQL 8.0.23 and 16 MB in MySQL 8.0.23+. The post states 16 MB which is correct for recent 8.0.x versions but could be clarified with a version note.
- The removed `SHOW VARIABLES LIKE 'innodb_undo_tablespaces'` line from the autoextend section was not re-added elsewhere since it was already implicitly covered by the existing queries and the variable is deprecated.
