# Validation Summary: How to Use sys Schema Formatting Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL sys schema
- MySQL Performance Schema
- sys.format_bytes() function
- sys.format_time() function
- sys.format_statement() function
- sys.ps_thread_id() function
- sys.ps_is_account_enabled() function
- sys.format_path() function
- sys.sys_config table

## Sources Consulted
- MySQL 8.0 Reference Manual — sys.format_bytes(): https://dev.mysql.com/doc/refman/8.0/en/sys-format-bytes.html
- MySQL 8.0 Reference Manual — sys.format_time(): https://dev.mysql.com/doc/refman/8.0/en/sys-format-time.html
- MySQL 8.0 Reference Manual — sys.format_statement(): https://dev.mysql.com/doc/refman/8.0/en/sys-format-statement.html
- MySQL 8.0 Reference Manual — sys.ps_thread_id(): https://dev.mysql.com/doc/refman/8.0/en/sys-ps-thread-id.html
- MySQL 8.0 Reference Manual — sys.ps_is_account_enabled(): https://dev.mysql.com/doc/refman/8.0/en/sys-ps-is-account-enabled.html
- MySQL 8.0 Reference Manual — sys.format_path(): https://dev.mysql.com/doc/refman/8.0/en/sys-format-path.html
- MySQL 8.0 Reference Manual — sys_config table: https://dev.mysql.com/doc/refman/8.0/en/sys-sys-config.html
- MySQL 8.0 Reference Manual — file_summary_by_instance table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-file-summary-tables.html

## Issues Found
- **ps_is_account_enabled() parameter order was reversed.** The blog had `sys.ps_is_account_enabled('app_user', '%')` which puts the username as the first argument and host as the second. Per the MySQL documentation, the function signature is `ps_is_account_enabled(in_host VARCHAR(255), in_user VARCHAR(32))` — host comes first, user comes second. Fixed to `sys.ps_is_account_enabled('%', 'app_user')`.

## Review Notes
- The `sys.format_bytes()`, `sys.format_time()`, `sys.ps_thread_id()`, and `sys.format_path()` functions are deprecated as of MySQL 8.0.16 in favor of built-in equivalents: `FORMAT_BYTES()`, `FORMAT_PICO_TIME()`, `PS_THREAD_ID()` / `PS_CURRENT_THREAD_ID()`, and no direct replacement for format_path. The post does not mention these deprecations. A future update could note the built-in alternatives for MySQL 8.0.16+.
- All format_bytes() output values verified correct (uses binary KiB/MiB/GiB units).
- All format_time() output values verified correct (10^9 ps = 1 ms, 10^12 ps = 1 s, 6*10^13 ps = 1 min).
- The performance_schema.file_summary_by_instance column names (FILE_NAME, SUM_NUMBER_OF_BYTES_READ, SUM_NUMBER_OF_BYTES_WRITE, SUM_TIMER_WAIT) are all correct.
- The sys_config variable `statement_truncate_len` is valid with a default value of 64.
