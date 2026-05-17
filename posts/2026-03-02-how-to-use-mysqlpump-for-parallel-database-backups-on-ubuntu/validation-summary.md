# Validation Summary: How to Use mysqlpump for Parallel Database Backups on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- mysqlpump (MySQL logical backup utility)
- mysqldump (comparison)
- MySQL 5.7 / MySQL 8.0
- Ubuntu (mysql-client package)
- LZ4 / ZLIB compression
- Bash scripting and cron scheduling

## Sources Consulted
- [MySQL 8.0 Reference Manual: mysqlpump](https://dev.mysql.com/doc/refman/8.0/en/mysqlpump.html)
- [MySQL 8.0.34 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-34.html) — deprecation announcement
- [MySQL 8.4.0 Release Notes](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/news-8-4-0.html) — removal of mysqlpump
- [MySQL 8.4 Reference Manual: What Is New since MySQL 8.0](https://dev.mysql.com/doc/mysql/en/mysql-nutshell.html)
- [MySQL 5.7 Reference Manual: mysqlpump](https://dev.mysql.com/doc/refman/5.7/en/mysqlpump.html)
- [MySQL lz4_decompress utility](https://docs.oracle.com/cd/E17952_01/mysql-8.0-en/lz4-decompress.html)

## Issues Found

1. **Missing deprecation/removal notice (critical).** The original post described mysqlpump as MySQL's "next-generation backup tool" without mentioning that it was deprecated in MySQL 8.0.34 (July 2023) and removed entirely in MySQL 8.4 (April 2024). For a post dated March 2026, this is a major omission since current MySQL LTS no longer ships the tool. Added a prominent deprecation notice near the top of the post pointing readers to `mysqldump` and MySQL Shell's dump utilities (`util.dumpInstance()` / `util.dumpSchemas()`) as the supported replacements. Also tightened "introduced in MySQL 5.7" to the precise version (5.7.8).

2. **Non-existent `--uncompress` option (factual error).** The "Built-in Compression" section showed `mysqlpump --uncompress /backup/all_databases.sql.lz4`, but mysqlpump has no `--uncompress` flag. MySQL ships separate `lz4_decompress` and `zlib_decompress` helper utilities to decompress the output, and the standard `lz4` CLI also works for LZ4 output. Replaced the example with correct `lz4_decompress` / `zlib_decompress` invocations and a fallback using the standard `lz4` tool.

3. **Misleading `--watch-progress` interval comment.** The Progress Reporting section claimed the example showed "progress every 5 seconds (default is 2000ms)", but `--watch-progress` is a boolean toggle with no configurable time interval, and the command shown does not change any interval. Replaced the comment with an accurate description: the flag is enabled by default (disable with `--skip-watch-progress`) and progress is written to stderr.

## Review Notes
- The `--parallel-schemas=N:db_name` syntax is correct; each `--parallel-schemas` flag creates a separate processing queue.
- `--default-parallelism`, `--defer-table-indexes`, `--skip-definer`, `--include-databases` / `--exclude-databases`, `--include-tables` / `--exclude-tables`, `--skip-dump-rows`, `--no-create-info`, `--compress-output=LZ4|ZLIB`, and `--add-drop-table=FALSE` are all valid mysqlpump options. (`--skip-add-drop-table` is the more idiomatic spelling but `--add-drop-table=FALSE` also works.)
- `--defer-table-indexes` is actually enabled by default in mysqlpump; passing it explicitly is harmless but redundant.
- `information_schema` and `performance_schema` are excluded automatically by mysqlpump, so listing them in `--exclude-databases` is redundant (but does no harm). The `sys` schema is not auto-excluded and should be listed if you want to skip it.
- The script uses `mysqlpump ... | gzip` and captures `$?` from the pipeline, which on bash will reflect only the exit status of `gzip`. For more accurate failure detection, `set -o pipefail` could be added — noted here but not changed, as it is a code-quality suggestion rather than a technical error.
- On Ubuntu 22.04 / 24.04, the `mysql-client` package still ships MySQL 8.0 series, so mysqlpump is currently available — but readers upgrading to MySQL 8.4 packages (when Ubuntu adopts them) will lose the binary entirely.
