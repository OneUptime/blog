# Validation Summary: How to Configure table_open_cache in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- MySQL server variables (`table_open_cache`, `table_open_cache_instances`, `table_definition_cache`, `open_files_limit`)
- MySQL performance_schema / status variables
- Linux file descriptor configuration (`/etc/security/limits.conf`, `ulimit`)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — `table_open_cache` (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_table_open_cache)
- MySQL 8.0 Reference Manual: Server System Variables — `table_open_cache_instances` (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_table_open_cache_instances)
- MySQL 8.0 Reference Manual: Server System Variables — `table_definition_cache` (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_table_definition_cache)
- MySQL 8.0 Reference Manual: Server Status Variables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: Data Dictionary (https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html)
- MySQL 8.0 Reference Manual: Performance Schema status variable tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html)

## Issues Found

1. **Incorrect "opens_per_hour" SQL query**: The formula `Opened_tables / (UNIX_TIMESTAMP() - Uptime / 3600)` was mathematically nonsensical — it subtracted hours from a seconds-since-epoch value. Fixed to `(Opened_tables / Uptime) * 3600`, which correctly divides total opens by uptime in seconds then multiplies by 3600 to get a per-hour rate.

2. **Used `information_schema.GLOBAL_STATUS` (removed in MySQL 8.0)**: The post targets MySQL 8.0 but used `information_schema.GLOBAL_STATUS`, which was removed in MySQL 8.0. Changed to `performance_schema.global_status`.

3. **Referenced `.frm` files for `table_definition_cache`**: MySQL 8.0 replaced `.frm` files with an InnoDB-based data dictionary. Changed "table `.frm` definitions" to "table definitions from the data dictionary".

4. **Incorrect `table_open_cache_instances` default description**: Claimed the default is "16 (or the number of CPUs, whichever is smaller)". The MySQL 8.0 documentation states the default is simply 16 with no CPU-based cap. Removed the inaccurate clause.

## Review Notes
- The ~2 KB per open table estimate is a commonly cited approximation. Actual memory per entry varies by storage engine and table structure, but the figure is reasonable as a rough guide.
- The `table_definition_cache` default of 2000 is correct for MySQL 8.0 when `table_open_cache` is at its default of 4000 (the autosize formula is `MIN(400 + table_open_cache / 2, 2000)`).
- The `/proc/$(pgrep mysqld)/limits` command is Linux-specific; macOS or other OS users would need a different approach. This is acceptable since MySQL servers typically run on Linux.
