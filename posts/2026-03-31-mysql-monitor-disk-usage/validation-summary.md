# Validation Summary: How to Monitor MySQL Disk Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- information_schema system tables (TABLES, INNODB_TABLESPACES)
- MySQL binary logging
- Prometheus alerting (node_exporter metrics)
- Linux CLI tools (du, df, awk)

## Sources Consulted
- MySQL 8.0 Reference Manual: information_schema.FILES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- MySQL 8.0 Reference Manual: information_schema.INNODB_TABLESPACES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: information_schema.TABLES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: SHOW BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual: binlog_expire_logs_seconds — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: Binary Log — https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- Prometheus node_exporter documentation for filesystem metrics

## Issues Found

### 1. Undo log query used wrong table and mixed columns from two different tables
- **What was wrong:** The query selected `NAME`, `SPACE_TYPE`, `FILE_SIZE`, and `ALLOCATED_SIZE` from `information_schema.FILES` with a `WHERE FILE_TYPE = 'UNDO LOG'` filter. However, `NAME`, `SPACE_TYPE`, `FILE_SIZE`, and `ALLOCATED_SIZE` are columns of `information_schema.INNODB_TABLESPACES`, not `information_schema.FILES`. The `FILES` table uses `FILE_NAME`, `FILE_TYPE`, and `INITIAL_SIZE` instead. This query would fail with unknown column errors.
- **What was changed:** Changed the table from `information_schema.FILES` to `information_schema.INNODB_TABLESPACES` and the filter from `FILE_TYPE = 'UNDO LOG'` to `SPACE_TYPE = 'Undo'`, which correctly matches undo tablespace entries using the proper column names.

### 2. Binary log file glob used outdated MySQL 5.7 naming convention
- **What was wrong:** The command `du -sh /var/lib/mysql/mysql-bin.*` uses the `mysql-bin` prefix, which was the default in MySQL 5.7 and earlier. In MySQL 8.0+, the default binary log basename is `binlog`, producing files like `binlog.000001`. Since the post already references `binlog_expire_logs_seconds` (a MySQL 8.0 feature), the file naming should be consistent with MySQL 8.0 defaults.
- **What was changed:** Updated the glob pattern from `mysql-bin.*` to `binlog.*`.

## Review Notes
- The `table_rows` column from `information_schema.TABLES` is an estimate for InnoDB tables (based on index statistics sampling), not an exact count. The post does not explicitly state this, but it's a common and acceptable convention in monitoring contexts.
- The Prometheus alert rule assumes `/var/lib/mysql` is on a dedicated mount point. If the MySQL data directory is on the root filesystem, the `mountpoint` label won't match. This is a deployment consideration rather than a technical error.
- The `df -h` cron alert script similarly assumes `/var/lib/mysql` resolves to a meaningful mount point for the percentage check.
- The `data_length + index_length` calculation from `information_schema.TABLES` gives an approximation of on-disk size. It may not account for all InnoDB overhead (e.g., undo logs, change buffer). For precise disk usage, the OS-level `du` commands shown in the post are more accurate.
