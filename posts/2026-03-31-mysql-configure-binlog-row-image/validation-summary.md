# Validation Summary: How to Configure binlog_row_image in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL binary logging (binlog)
- MySQL replication
- `binlog_row_image` system variable
- `binlog_row_metadata` system variable
- CDC tools (Debezium, Maxwell, Tungsten Replicator)

## Sources Consulted
- MySQL 8.0 Reference Manual — binlog_row_image system variable: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_row_image
- MySQL 8.0 Reference Manual — binlog_row_metadata system variable: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_row_metadata
- MySQL 8.0 Reference Manual — SHOW MASTER STATUS / SHOW BINARY LOG STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-master-status.html
- MySQL 8.0 Reference Manual — mysqlbinlog row event display: https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog-row-events.html
- Debezium MySQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/mysql.html

## Issues Found
No technical issues found.

## Review Notes
- `SHOW MASTER STATUS` was deprecated in MySQL 8.2.0 and removed in MySQL 8.4.0, replaced by `SHOW BINARY LOG STATUS`. The post does not specify a MySQL version, and the command remains correct for MySQL 5.7 and 8.0 (the most widely deployed versions). Future readers on MySQL 8.4+ should use `SHOW BINARY LOG STATUS` instead.
- The post's claim that NOBLOB excludes JSON and GEOMETRY columns goes slightly beyond official documentation wording (which says "BLOB and TEXT columns"), but is technically accurate because JSON and GEOMETRY types use the internal BLOB storage flag and are indeed excluded by NOBLOB in practice.
- The `binlog_row_image` variable can also be set at session scope (`SET SESSION`), not just globally. The post's focus on `SET GLOBAL` is appropriate for the typical use case.
