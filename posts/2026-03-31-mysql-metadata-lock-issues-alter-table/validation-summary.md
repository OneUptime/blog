# Validation Summary: How to Handle Metadata Lock Issues During ALTER TABLE in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB, Online DDL, metadata locks)
- Percona Toolkit (pt-online-schema-change)
- gh-ost (GitHub Online Schema Transmogrifier)
- MySQL sys schema (schema_table_lock_waits view)
- MySQL information_schema (innodb_trx, processlist)

## Sources Consulted
- gh-ost official documentation and cheatsheet: https://github.com/github/gh-ost/blob/master/doc/cheatsheet.md
- gh-ost command-line flags reference: https://github.com/github/gh-ost/blob/master/doc/command-line-flags.md
- MySQL 8.0 Reference Manual — Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual — lock_wait_timeout: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_lock_wait_timeout
- MySQL 8.0 Reference Manual — metadata locking: https://dev.mysql.com/doc/refman/8.0/en/metadata-locking.html
- Percona Toolkit pt-online-schema-change documentation: https://docs.percona.com/percona-toolkit/pt-online-schema-change.html

## Issues Found
1. **gh-ost command used incorrect flag `--mysql-password`**: The correct gh-ost flag is `--password`, not `--mysql-password`. Verified against the official gh-ost cheatsheet documentation. Changed `--mysql-password="secure_password"` to `--password="secure_password"`.
2. **gh-ost command was missing `--user` flag**: The gh-ost command requires a `--user` flag to specify the MySQL user. Added `--user="admin"` for consistency with the pt-online-schema-change example.
3. **gh-ost command was missing `--host` flag**: Added `--host=localhost` for completeness and consistency with the pt-online-schema-change example above it.

## Review Notes
- MySQL 8.0.12+ supports `ALGORITHM=INSTANT` for adding columns at the end of a table, which is faster than the `ALGORITHM=INPLACE` shown in the examples. The post's use of INPLACE is not wrong (it still works), but readers on MySQL 8.0.12+ could benefit from knowing about INSTANT. This is a potential improvement, not an error.
- The SQL diagnostic queries, online DDL syntax, `lock_wait_timeout` usage, pt-online-schema-change command, `sys.schema_table_lock_waits` view, and `KILL CONNECTION` statement are all technically correct.
- The explanation of the MDL blocking cascade (how pending exclusive locks block subsequent shared lock requests) is accurate.
