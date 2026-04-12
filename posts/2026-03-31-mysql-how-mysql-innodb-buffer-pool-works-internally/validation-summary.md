# Validation Summary: How MySQL InnoDB Buffer Pool Works Internally

## Status
validated

## Post Type
Technical Guide / Reference

## Technologies Covered
- MySQL 8.0
- InnoDB Storage Engine
- InnoDB Buffer Pool
- Performance Schema
- information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html)
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html)
- MySQL 8.0 Reference Manual: Server Status Variables (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: Option File Syntax (https://dev.mysql.com/doc/refman/8.0/en/option-files.html)

## Issues Found
1. **Incorrect comment syntax in my.cnf config block**: The `innodb_buffer_pool_dump_pct` line used `--` for an inline comment (`-- Save the hottest 25% of pages`). MySQL option files (`my.cnf`) only support `#` and `;` as comment characters, not `--`. The `--` prefix is valid for command-line options but not in option files. Changed to `#` comment syntax.

## Review Notes
- All SQL queries, variable names, column names, and status variable names are correct and current for MySQL 8.0.
- The `innodb_max_dirty_pages_pct` default of 90% is correct for MySQL 8.0.3+; earlier MySQL versions (5.6, 5.7) used a default of 75. The post does not specify a version, but since MySQL 8.0 is the current major version, this is acceptable.
- The hit rate calculation query uses `VARIABLE_VALUE` (VARCHAR type) in arithmetic; MySQL's implicit type conversion and floating-point `/` operator handle this correctly.
- The post could mention that `innodb_buffer_pool_instances` is effectively ignored when the buffer pool size is less than 1GB (MySQL sets it to 1), but this is a minor omission, not an error.
- The adaptive hash index and change buffer are also stored in the buffer pool but are not mentioned; the post's list is not intended to be exhaustive, so this is not an error.
