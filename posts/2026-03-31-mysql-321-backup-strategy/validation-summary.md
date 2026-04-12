# Validation Summary: How to Implement a 3-2-1 Backup Strategy for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB, binary logging, mysqldump)
- Percona XtraBackup
- AWS S3 (with server-side encryption and lifecycle policies)
- AWS CLI
- Bash scripting
- Cron scheduling

## Sources Consulted
- MySQL 8.4 Reference Manual — mysqldump options: https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- MySQL 8.0.26 Release Notes (deprecation of --master-data in favor of --source-data): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html
- MySQL 8.4 Reference Manual — Server System Variables (log_bin, binlog_format, sync_binlog, innodb_flush_log_at_trx_commit): https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html
- Percona XtraBackup Documentation: https://docs.percona.com/percona-xtrabackup/
- AWS CLI S3 cp reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- **`--master-data=2` is deprecated/removed**: The `mysqldump` command used `--master-data=2`, which was deprecated in MySQL 8.0.26 (July 2021) and removed entirely in MySQL 8.4 (April 2024). Replaced with `--source-data=2`, which is the current equivalent flag that records the binary log file name and position as a SQL comment in the dump output.

## Review Notes
- The MySQL configuration snippet (`log_bin`, `binlog_format = ROW`, `sync_binlog = 1`, `innodb_flush_log_at_trx_commit = 1`) is correct and represents best practices for durability.
- `--single-transaction` is correctly described as providing a consistent snapshot without locking (for InnoDB tables).
- The `--triggers` flag is included by default in `mysqldump`, but listing it explicitly is harmless and improves readability.
- The Percona XtraBackup command uses `--password=secret` on the command line, which works but would expose the password in process listings. A production script should use `--login-path` or a defaults file instead. This is not a correctness issue, so no change was made.
- The `aws s3 cp - s3://...` streaming upload from stdin is correctly used for piping tar output directly to S3.
- Note that `binlog_format` is deprecated in MySQL 8.4 as ROW is now the only supported format. The setting is still accepted but unnecessary on MySQL 8.4+.
