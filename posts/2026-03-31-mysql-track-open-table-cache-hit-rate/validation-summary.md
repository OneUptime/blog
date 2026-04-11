# Validation Summary: How to Track MySQL Open Table Cache Hit Rate

## Status
validated

## Post Type
Tutorial / Monitoring Guide

## Technologies Covered
- MySQL (table open cache, performance_schema)
- Bash scripting (for delta measurement)
- Linux OS-level configuration (ulimit, open_files_limit)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables (Opened_tables, Open_tables) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: Server System Variables (table_open_cache, table_open_cache_instances, open_files_limit) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Performance Schema system variable tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-system-variable-tables.html
- MySQL 8.0 Reference Manual: Data Dictionary (removal of .frm files) — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary.html

## Issues Found
1. **Outdated `.frm` file reference**: The intro paragraph mentioned `.ibd` (InnoDB) or `.frm` file descriptors. In MySQL 8.0+, `.frm` files were removed entirely; table metadata is now stored in the InnoDB data dictionary. Removed the `.frm` reference and clarified that the cache stores file handles and parsed table definitions.

2. **Incorrect performance_schema table for global variable**: The "Checking If Cache Is Full" query used `performance_schema.session_variables` to read `table_open_cache`. Since `table_open_cache` is a global-only variable, changed it to `performance_schema.global_variables` for correctness.

## Review Notes
- The `table_open_cache_instances` variable was deprecated in MySQL 8.4. The post doesn't specify a MySQL version, so the advice remains correct for MySQL 8.0.x. If the post is updated in the future, a deprecation note for 8.4+ may be warranted.
- The `open_files_limit` formula (`table_open_cache * 2 + max_connections + 10`) matches the MySQL documentation's internal calculation for the minimum effective value.
- The bash script for measuring the delta of `Opened_tables` is a valid approach. The `-se` flags are correct (silent mode + execute).
