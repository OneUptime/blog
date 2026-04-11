# Validation Summary: What Is the InnoDB Undo Log in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB undo log
- Multi-Version Concurrency Control (MVCC)
- InnoDB undo tablespaces
- InnoDB purge system

## Sources Consulted
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: InnoDB INFORMATION_SCHEMA Metrics Table — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-metrics-table.html
- MySQL 8.0 Reference Manual: Purge Configuration — https://dev.mysql.com/doc/refman/8.0/en/innodb-purge-configuration.html
- MySQL 8.0 Reference Manual: FILES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- MySQL 8.0 Reference Manual: Undo Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-tablespaces.html
- MySQL Bug #83026: innodb history list length missing in SHOW GLOBAL STATUS — https://bugs.mysql.com/bug.php?id=83026

## Issues Found

### 1. Incorrect column name in INNODB_TABLESPACES query
- **What was wrong:** The query used `SIZE` as a column name in `SELECT NAME, STATE, SIZE FROM information_schema.INNODB_TABLESPACES`. The `INNODB_TABLESPACES` table has no `SIZE` column.
- **What was changed:** Replaced `SIZE` with `FILE_SIZE`, which is the correct column name per the MySQL 8.0 documentation.

### 2. Incorrect filter column in INNODB_TABLESPACES query
- **What was wrong:** The query filtered with `WHERE ROW_FORMAT = 'Undo'`. While this technically works (ROW_FORMAT does have an 'Undo' value), `ROW_FORMAT` describes the row storage format, not the tablespace type.
- **What was changed:** Replaced `ROW_FORMAT = 'Undo'` with `SPACE_TYPE = 'Undo'`, which is the semantically correct column for identifying undo tablespaces.

### 3. Non-existent status variable for history list length
- **What was wrong:** The purge monitoring query used `Innodb_purge_trx_id_age` from `performance_schema.global_status`. This variable does not exist in standard MySQL 8.0. Additionally, even the concept it was intended to represent (purge transaction ID age) is not the same as the history list length.
- **What was changed:** Replaced with a query against `information_schema.INNODB_METRICS` using the `trx_rseg_history_len` metric, which is the correct and documented way to programmatically retrieve the InnoDB history list length in MySQL 8.0.

## Review Notes
- The MVCC example uses two sessions shown in a single SQL block with comments to separate them. This is a common blog convention and is clear enough for illustrative purposes.
- The `SHOW ENGINE INNODB STATUS\G` command uses the `\G` MySQL client formatter, which is appropriate for a MySQL-focused blog post.
- The `CREATE UNDO TABLESPACE` syntax shown requires MySQL 8.0.14 or later; this is not explicitly noted but is a minor omission since the post targets MySQL 8.0 generally.
- `innodb_undo_log_truncate` is enabled by default starting in MySQL 8.0.2, so the `SET GLOBAL innodb_undo_log_truncate = ON` command is only needed if it was previously disabled. This could be noted but is not technically incorrect.
