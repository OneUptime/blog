# Validation Summary: How to Use Binary Logs for Point-in-Time Recovery in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL binary logging (`mysqlbinlog`)
- `mysqldump` for full backups with binary log position recording
- MySQL point-in-time recovery (PITR)
- MySQL server configuration (`my.cnf`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Point-in-Time (Incremental) Recovery: https://dev.mysql.com/doc/refman/8.0/en/point-in-time-recovery.html
- MySQL 8.0 Reference Manual — mysqlbinlog utility: https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog.html
- MySQL 8.0 Reference Manual — mysqldump --master-data / --source-data: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — Binary Log configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual — SHOW BINARY LOG STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-binary-log-status.html

## Issues Found
- **Missing `--verbose` flag on `mysqlbinlog` grep command**: The post configures `binlog_format=ROW`, but the command to search for destructive operations (`grep -i "drop table\|delete from\|truncate"`) ran `mysqlbinlog` without the `--verbose` flag. With ROW-based binary logging, DML statements like `DELETE FROM` are stored as row events (binary data), not as SQL text. Without `--verbose` (`-v`), `mysqlbinlog` outputs raw BINLOG-encoded events for DML, so grepping for `delete from` would not find row-based delete events. Added `--verbose` to decode row events into human-readable SQL-like annotations (`### DELETE FROM ...`). Note: DDL statements like `DROP TABLE` and `TRUNCATE TABLE` are always logged as statements regardless of `binlog_format`, so those would be found either way.

## Review Notes
- **`--master-data` is deprecated in MySQL 8.0.26+**: The `--master-data` option for `mysqldump` was deprecated in MySQL 8.0.26 in favor of `--source-data`. The flag still works but will produce a deprecation warning on newer MySQL 8.0.x versions. The replacement is `--source-data=2`.
- **`SHOW MASTER STATUS` is deprecated in MySQL 8.0.22+**: This statement was deprecated in favor of `SHOW BINARY LOG STATUS`. It still works but may be removed in a future release.
- **`expire_logs_days` is deprecated in MySQL 8.0**: This system variable was deprecated in favor of `binlog_expire_logs_seconds`. The equivalent of 14 days would be `binlog_expire_logs_seconds=1209600`. Both can coexist, but `binlog_expire_logs_seconds` takes precedence if set.
- These deprecations were not fixed in the post because the deprecated syntax still functions in current MySQL 8.0.x releases and the post does not target a specific MySQL version. However, readers using MySQL 8.2+ should use the newer syntax.
