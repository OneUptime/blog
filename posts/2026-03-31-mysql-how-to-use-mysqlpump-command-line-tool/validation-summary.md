# Validation Summary: How to Use mysqlpump Command-Line Tool

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.8+)
- mysqlpump command-line utility
- mysqldump (comparison)
- LZ4 and ZLIB compression
- lz4_decompress / zlib_decompress utilities

## Sources Consulted
- MySQL 8.0 Reference Manual — mysqlpump: https://dev.mysql.com/doc/refman/8.0/en/mysqlpump.html
- MySQL 8.0 Reference Manual — lz4_decompress: https://dev.mysql.com/doc/refman/8.0/en/lz4-decompress.html
- MySQL 8.0 Reference Manual — zlib_decompress: https://dev.mysql.com/doc/refman/8.0/en/zlib-decompress.html
- MySQL 8.4 Release Notes (deprecation/removal of mysqlpump): https://dev.mysql.com/doc/relnotes/mysql/8.4/en/
- MySQL 8.0 Reference Manual — mysqldump: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html

## Issues Found

1. **Incorrect comparison with mysqldump (line 21):** The post stated "Unlike `mysqldump`, `mysqlpump` writes output to stdout by default." Both mysqldump and mysqlpump write to stdout by default, so the comparison was incorrect. Removed the "Unlike `mysqldump`" prefix.

2. **Non-existent `mysqldecompress` utility (lines 85-87):** The post used `mysqldecompress` to decompress LZ4 output. This utility does not exist. The correct MySQL-provided utilities are `lz4_decompress` (for LZ4) and `zlib_decompress` (for ZLIB). Additionally, these utilities take `input_file output_file` as positional arguments and do not support stdout piping. Fixed to `lz4_decompress full_backup.lz4 full_backup.sql` and added a note about `zlib_decompress`.

3. **Incorrect piped restore command (lines 170-173):** The post piped `mysqldecompress` output directly into `mysql`. Since `lz4_decompress` requires file arguments and does not support piping, changed this to a two-step process: decompress to a file, then restore from it.

4. **Missing deprecation notice:** `mysqlpump` was deprecated in MySQL 8.0.34 (October 2023) and removed in MySQL 8.4.0 (April 2024). For a 2026 blog post, this is critical information. Added a deprecation note in the introductory section recommending `mysqldump` or MySQL Shell's `util.dumpInstance()` as alternatives.

## Review Notes
- The `--watch-progress` progress output shown is illustrative rather than exact, but conveys the right idea. The actual format may vary slightly by MySQL version.
- The comparison table's "mysqldump Availability: MySQL 5.1+" is reasonable, though mysqldump existed in earlier versions as well.
- The `--exclude-databases=%` wildcard syntax for exporting only users is correct but somewhat unusual; it works because mysqlpump supports SQL LIKE-pattern wildcards in database/table name filters.
- The backup script stores the password in a command-line argument (`-p"$MYSQL_PASSWORD"`), which can be visible in process listings. A `--defaults-file` or `--login-path` approach would be more secure, but this is a common pattern in tutorials.
