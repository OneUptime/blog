# Validation Summary: How to Fix Disk Full Errors in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (5.7 and 8.0+)
- InnoDB storage engine
- Linux filesystem commands (df, du, find, truncate, rsync)
- MySQL binary logging
- MySQL InnoDB undo tablespaces
- systemd service management

## Sources Consulted
- MySQL 8.0 Reference Manual: PURGE BINARY LOGS Statement — https://dev.mysql.com/doc/refman/8.0/en/purge-binary-logs.html
- MySQL 8.0 Reference Manual: Server System Variables (expire_logs_days, binlog_expire_logs_seconds) — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: InnoDB File-Per-Table Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html
- MySQL 8.0 Reference Manual: innodb_undo_log_truncate — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_undo_log_truncate
- MySQL 8.0 Reference Manual: innodb_max_undo_log_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_max_undo_log_size
- MySQL 8.0 Reference Manual: Moving or Copying InnoDB Tables — https://dev.mysql.com/doc/refman/8.0/en/innodb-migration.html

## Issues Found
- **Incorrect `.ibd` file search command**: The command `du -sh /var/lib/mysql/*.ibd` only matches `.ibd` files directly in `/var/lib/mysql/`, but with `innodb_file_per_table` (the default since MySQL 5.6.6), per-table `.ibd` files are stored in database subdirectories (e.g., `/var/lib/mysql/mydb/table.ibd`). The glob `*.ibd` does not match recursively. Fixed by replacing with `find /var/lib/mysql -name "*.ibd" -exec du -sh {} + 2>/dev/null | sort -rh | head -10` to search all subdirectories.

## Review Notes
- The binary log retention config section shows both `expire_logs_days` and `binlog_expire_logs_seconds` under the same `[mysqld]` block. In MySQL 8.0.3+, `expire_logs_days` is deprecated in favor of `binlog_expire_logs_seconds`. If both are set simultaneously in MySQL 8.0, a warning is produced and `binlog_expire_logs_seconds` takes precedence. The comment in the post ("# MySQL 8.0+") does indicate they are version-specific alternatives, so this is acceptable but readers should understand they should use one or the other, not both.
- The data directory move procedure uses `rsync -avz` with `sudo`, which preserves ownership and permissions. On systems with SELinux or AppArmor, additional security context updates may be needed (e.g., `chcon` or AppArmor profile edits), but this is platform-specific and outside the core scope.
- All SQL syntax (`SHOW BINARY LOGS`, `PURGE BINARY LOGS`, `OPTIMIZE TABLE`, `SET GLOBAL`) is correct per MySQL documentation.
- The `information_schema.TABLES` query correctly references `DATA_LENGTH` and `DATA_FREE` columns.
- Error codes cited (1114/HY000 and errno 28) are accurate for disk-full conditions in MySQL.
