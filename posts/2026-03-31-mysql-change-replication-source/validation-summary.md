# Validation Summary: How to Use CHANGE REPLICATION SOURCE Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.23+ (CHANGE REPLICATION SOURCE TO statement)
- MySQL Replication (binary log position and GTID-based)
- mysqldump (--source-data option)
- MySQL SSL/TLS replication encryption
- MySQL multi-source replication channels

## Sources Consulted
- MySQL 8.0 Reference Manual — CHANGE REPLICATION SOURCE TO Statement: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual — SHOW REPLICA STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual — mysqldump options (--source-data / --master-data): https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0.23 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-23.html

## Issues Found
1. **Deprecated `--master-data` mysqldump option**: The post used `--master-data=2` in the mysqldump command and showed the old `CHANGE MASTER TO` comment format in the dump output. The `--master-data` option was deprecated in MySQL 8.0.26 and replaced by `--source-data`. Since the post specifically covers the new `CHANGE REPLICATION SOURCE TO` syntax (MySQL 8.0.23+), the mysqldump section was updated to use `--source-data=2` with a parenthetical note about the old name, and the dump output comment was updated to show the new `CHANGE REPLICATION SOURCE TO` format.

## Review Notes
- The `--source-data` option was introduced in MySQL 8.0.26, which is three minor versions after `CHANGE REPLICATION SOURCE TO` (8.0.23). Users on MySQL 8.0.23–8.0.25 would still need to use `--master-data`. The parenthetical note in the post addresses this.
- All SQL syntax, option names (`SOURCE_HOST`, `SOURCE_PORT`, `SOURCE_USER`, `SOURCE_PASSWORD`, `SOURCE_LOG_FILE`, `SOURCE_LOG_POS`, `SOURCE_AUTO_POSITION`, `SOURCE_SSL`, `SOURCE_SSL_CA`, `SOURCE_SSL_CERT`, `SOURCE_SSL_KEY`), and command sequences (`STOP REPLICA` / `START REPLICA` / `RESET REPLICA` / `SHOW REPLICA STATUS`) are correct per the MySQL 8.0 reference manual.
- The `SHOW REPLICA STATUS` column names `Replica_IO_Running` and `Replica_SQL_Running` are correct for MySQL 8.0.22+.
- The version claim that `CHANGE REPLICATION SOURCE TO` was introduced in MySQL 8.0.23 is accurate.
