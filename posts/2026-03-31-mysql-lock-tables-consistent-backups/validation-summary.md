# Validation Summary: How to Use LOCK TABLES for Consistent Backups in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB, MyISAM storage engines)
- mysqldump CLI tool
- LOCK TABLES / FLUSH TABLES WITH READ LOCK statements
- MySQL MVCC and REPEATABLE READ isolation

## Sources Consulted
- MySQL 8.4 Reference Manual: FLUSH TABLES WITH READ LOCK — https://dev.mysql.com/doc/refman/8.4/en/flush.html
- MySQL 8.4 Reference Manual: LOCK TABLES — https://dev.mysql.com/doc/refman/8.4/en/lock-tables.html
- MySQL 8.4 Reference Manual: SHOW BINARY LOG STATUS (replacement for deprecated SHOW MASTER STATUS) — https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- MySQL 8.4 Reference Manual: mysqldump options (--single-transaction, --lock-tables, --lock-all-tables) — https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- MySQL 8.4 Reference Manual: START TRANSACTION WITH CONSISTENT SNAPSHOT — https://dev.mysql.com/doc/refman/8.4/en/commit.html
- MySQL 8.4 Reference Manual: GRANT privileges (SELECT, LOCK TABLES, RELOAD, SHOW VIEW, EVENT, TRIGGER) — https://dev.mysql.com/doc/refman/8.4/en/grant.html

## Issues Found
1. **`SHOW MASTER STATUS` is deprecated/removed**: The post used `SHOW MASTER STATUS` which was deprecated in MySQL 8.0.22 and removed in MySQL 8.4 (April 2024). Replaced with the current equivalent `SHOW BINARY LOG STATUS`.

## Review Notes
- The `--lock-tables` option locks tables per-database, not globally. The post correctly distinguishes this from `--lock-all-tables` for mixed environments, but readers should be aware that `--lock-tables` does not guarantee cross-database consistency.
- The `--password=value` flag on the command line is insecure (visible in process lists). MySQL emits a warning about this. The post uses it for clarity in examples, which is common practice, but production scripts should use `--defaults-file` or the `mysql_config_editor` utility instead.
- The `--triggers` flag shown in the InnoDB example is enabled by default in mysqldump, so it is technically redundant but harmless and makes the intent explicit.
