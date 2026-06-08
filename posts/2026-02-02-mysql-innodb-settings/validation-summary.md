# Validation Summary: How to Configure MySQL InnoDB Settings on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0 (with notes for 8.0.30+ and earlier)
- InnoDB storage engine
- Ubuntu (20.04, 22.04, 24.04)
- systemd service management
- MySQL `my.cnf` / `mysqld.cnf` configuration
- `performance_schema` / `information_schema` for monitoring
- Binary logging (point-in-time recovery)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Configuration: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 — `innodb_flush_log_at_trx_commit`: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit
- MySQL 8.0 — `innodb_redo_log_capacity` (introduced 8.0.30): https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 — `innodb_buffer_pool_size` / instances / chunk size: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html
- MySQL 8.0 — `SHOW VARIABLES` syntax: https://dev.mysql.com/doc/refman/8.0/en/show-variables.html
- MySQL 8.0 — `innodb_doublewrite_dir` (8.0.20+): https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_doublewrite_dir
- MySQL 8.0 — Undo tablespaces management: https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-tablespaces.html
- MySQL 8.0 — Change buffer: https://dev.mysql.com/doc/refman/8.0/en/innodb-change-buffer.html
- Ubuntu MySQL package documentation (apt install mysql-server)

## Issues Found

1. **Invalid `SHOW VARIABLES` syntax** in section 9 (Dynamic Configuration Changes). The query `SHOW VARIABLES LIKE 'innodb%' WHERE Variable_name LIKE '%dynamic%';` combines both `LIKE` and `WHERE`, which is not permitted by MySQL's grammar (the syntax is `SHOW VARIABLES [LIKE 'pattern' | WHERE expr]` — one or the other, not both). Additionally, no variable name actually contains the substring `dynamic`, so the query would never yield meaningful results even if syntactically valid. **Fix:** Replaced the broken query with a comment directing the reader to the MySQL documentation to determine which variables are dynamic, preserving the author's intent without producing a syntax error.

2. **Imprecise description of `innodb_flush_log_at_trx_commit` values 0 and 2** in section 2 (Redo Log Configuration). The original wording suggested that value 0 was "Flush per second without sync (fastest)" and value 2 was "Flush per second (good performance, slight risk)", which conflates the two and misrepresents the actual semantics. Per the MySQL 8.0 manual: value 0 writes and flushes once per second; value 2 writes at each commit but flushes to disk once per second. The practical distinction is that value 2 survives a `mysqld` crash (writes are already in the OS file cache) while value 0 may lose up to a second of committed transactions on either an `mysqld` or OS crash. **Fix:** Rewrote the inline comments to accurately reflect MySQL's documented behavior for each value.

## Review Notes

- **`innodb_undo_tablespaces`** is included in the configuration examples. In MySQL 8.0.14+, this variable still exists and is honored at first startup, but the documented way to manage undo tablespaces is via `CREATE UNDO TABLESPACE` / `DROP UNDO TABLESPACE` SQL statements. Setting `innodb_undo_tablespaces = 2` matches the MySQL 8.0 default and remains valid, so no change was made. Readers tuning a long-lived server should manage undo tablespaces through SQL.
- **Change buffer** (`innodb_change_buffering`, `innodb_change_buffer_max_size`) was deprecated in MySQL 8.0.36 and is removed in MySQL 9.0. For the MySQL 8.0 audience this post explicitly targets, the configuration is still valid, but the settings will be unrecognized on MySQL 9.x.
- **`innodb_log_file_size` / `innodb_log_files_in_group`** correctly attributed to MySQL 8.0.29 and earlier; both were deprecated in 8.0.30 in favor of `innodb_redo_log_capacity`. The post handles this version split accurately.
- **`innodb_use_native_aio = ON`** is the default on Linux since MySQL 8.0; explicitly setting it is harmless but redundant.
- **`SHOW ENGINE INNODB STATUS\G`** uses the `\G` terminator, which is a `mysql` CLI feature, not standard SQL. This is fine in context (the surrounding examples are clearly run through `mysql`) but would not work if pasted into a generic SQL client.
- **Buffer pool page size calculations** in the SQL assume the 16 KB default page size. If a reader has changed `innodb_page_size`, the `* 16 / 1024` math would be wrong, but this is a reasonable simplification for the default case.
- The `innodb_buffer_pool_size = 12G` combined with `innodb_buffer_pool_instances = 12` and `innodb_buffer_pool_chunk_size = 128M` satisfies MySQL's requirement that buffer_pool_size be an integer multiple of `chunk_size * instances` (12 GB = 12 × 128 MB × 8, so it's a multiple of 12 × 128 MB = 1.5 GB → 12 GB / 1.5 GB = 8 ✓). Math checks out.
