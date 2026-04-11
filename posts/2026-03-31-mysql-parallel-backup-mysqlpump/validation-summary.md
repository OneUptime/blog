# Validation Summary: How to Use Parallel Backup with mysqlpump in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7, 8.0)
- mysqlpump backup utility
- lz4_decompress / zlib_decompress utilities

## Sources Consulted
- MySQL 8.0 mysqlpump documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqlpump.html
- MySQL 5.7 mysqlpump documentation: https://dev.mysql.com/doc/refman/5.7/en/mysqlpump.html
- MySQL 8.0.34 Release Notes (deprecation notice): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-34.html
- MySQL blog - Introducing mysqlpump: https://dev.mysql.com/blog-archive/introducing-mysqlpump/

## Issues Found

1. **Missing deprecation notice**: mysqlpump was deprecated in MySQL 8.0.34 (July 2023) and removed in MySQL 8.4. For a post published in 2026, this is critical context. Added a deprecation note at the top of the article directing readers to mysqldump or MySQL Shell utilities as alternatives.

2. **`--decompress` flag does not exist**: The decompression section used `mysqlpump --decompress` to decompress compressed backups. This flag does not exist in mysqlpump. Fixed to use the correct `lz4_decompress` and `zlib_decompress` utilities that ship with MySQL.

3. **`--routines` and `--events` flags are redundant**: The "Including Routines and Events" section implied these flags were needed to include routines and events in the backup. Unlike mysqldump, mysqlpump includes routines and events by default. Rewrote the section to clarify this default behavior and show how to exclude them with `--skip-routines`/`--skip-events` instead.

4. **`--single-transaction` with parallel threads caveat**: The original post showed `--single-transaction` used with `--default-parallelism=4`, which does not provide cross-table consistency because each thread opens its own transaction. Fixed the example to use `--default-parallelism=0` for consistent snapshots and added an explanation of the limitation.

## Review Notes
- The comparison table listing `--single-transaction` for both mysqldump and mysqlpump is technically correct (both support the flag), but the consistency guarantees differ significantly when mysqlpump uses parallel threads. The added caveat addresses this.
- The `lz4_decompress` and `zlib_decompress` utilities were also removed in MySQL 8.4 along with mysqlpump itself. Users on MySQL 8.4+ would need to use mysqldump or MySQL Shell utilities entirely.
- The `--exclude-tables` syntax with `db.table` format (e.g., `--exclude-tables=myapp.event_logs`) is valid per the MySQL documentation.
