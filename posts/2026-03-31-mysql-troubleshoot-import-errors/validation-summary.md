# Validation Summary: How to Troubleshoot MySQL Import Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (server and client)
- mysqldump (import/export)
- LOAD DATA INFILE
- mysqlimport
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Error Message Reference (https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
- MySQL 8.0 Reference Manual — mysql Client Options, `--init-command` (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html#option_mysql_init-command)
- MySQL 8.0 Reference Manual — `max_allowed_packet` system variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_allowed_packet)
- MySQL 8.0 Reference Manual — `secure_file_priv` system variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_secure_file_priv)
- MySQL 8.0 Reference Manual — LOAD DATA INFILE syntax (https://dev.mysql.com/doc/refman/8.0/en/load-data.html)
- MySQL 8.0 Reference Manual — `foreign_key_checks` variable (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_foreign_key_checks)
- MySQL 8.0 Reference Manual — information_schema.SCHEMATA table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html)

## Issues Found
No technical issues found.

All error codes and SQLSTATE values are correct:
- ERROR 1005 (HY000) errno 150 — foreign key constraint incorrectly formed
- ERROR 1153 (08S01) — packet bigger than max_allowed_packet
- ERROR 1366 (HY000) — incorrect string value
- ERROR 1290 (HY000) — secure-file-priv restriction
- ERROR 3 (HY000) Errcode 28 — no space left on device (ENOSPC)

All SQL syntax, CLI flags, and commands are valid and correct.

## Review Notes
- The `SET GLOBAL max_allowed_packet` command affects new connections only, not the current session. The post pairs it with the `--max_allowed_packet=1G` command-line alternative which directly sets the session value, so the practical guidance is sound.
- The `sql_log_bin = 0` advice with the caveat "Only on standalone servers, not replicas" is conservative but reasonable. More precisely, it should be avoided on any server that acts as a replication source, but the simplified guidance is appropriate for this audience.
- The `\xE2\x80\x9C` bytes shown in the ERROR 1366 example are the UTF-8 encoding of U+201C (left double quotation mark), which is a realistic and well-chosen example of an encoding mismatch scenario.
