# Validation Summary: How to Understand InnoDB Architecture in MySQL

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL (8.0+)
- InnoDB storage engine
- performance_schema
- information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Architecture: https://dev.mysql.com/doc/refman/8.0/en/innodb-architecture.html
- MySQL 8.0 Reference Manual — InnoDB Buffer Pool: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual — InnoDB Redo Log: https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual — InnoDB Undo Logs: https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-logs.html
- MySQL 8.0 Reference Manual — InnoDB Change Buffer: https://dev.mysql.com/doc/refman/8.0/en/innodb-change-buffer.html
- MySQL 8.0 Reference Manual — InnoDB Doublewrite Buffer: https://dev.mysql.com/doc/refman/8.0/en/innodb-doublewrite-buffer.html
- MySQL 8.0 Reference Manual — innodb_redo_log_capacity: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_redo_log_capacity
- MySQL 8.0 Reference Manual — INNODB_TABLESPACES table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual — InnoDB File-Per-Table Tablespaces: https://dev.mysql.com/doc/refman/8.0/en/innodb-file-per-table-tablespaces.html

## Issues Found
- **Incorrect .ibd file path in Tablespace Files section**: The command `ls -lh /var/lib/mysql/*.ibd` with the comment "Per-table files (innodb_file_per_table=ON)" was incorrect. When `innodb_file_per_table=ON` (the default since MySQL 5.6.6), each table's `.ibd` file is stored in its database subdirectory at `/var/lib/mysql/<database>/<table>.ibd`, not directly in `/var/lib/mysql/`. The glob `*.ibd` in the data directory root would only match system-level `.ibd` files (e.g., `mysql.ibd` in MySQL 8.0), not per-table tablespace files. Fixed the path to `/var/lib/mysql/<database>/*.ibd` with proper alignment of the inline comments.

## Review Notes
- The `innodb_change_buffering` variable and the change buffer feature were deprecated in MySQL 8.0.25 and removed in MySQL 9.0. The post's description is correct for MySQL 8.0 but readers on newer versions should be aware of this deprecation.
- The `innodb_doublewrite` variable gained additional values (`DETECT_ONLY`, `DETECT_AND_RECOVER`) in MySQL 8.0.20. The post's use of `0` to disable it remains valid but the newer options may be worth noting in a future update.
- The buffer pool hit rate query uses implicit string-to-number conversion on `VARIABLE_VALUE` from `performance_schema.global_status`. This works correctly in MySQL but an explicit `CAST()` could improve clarity.
- All SQL syntax, variable names, status variable names, and `information_schema`/`performance_schema` table references are correct for MySQL 8.0.
