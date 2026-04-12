# Validation Summary: How to Use the innodb_buffer_stats_by_table View in MySQL sys Schema

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL sys schema
- InnoDB buffer pool
- `information_schema.INNODB_BUFFER_PAGE` table

## Sources Consulted
- MySQL 8.0 sys.innodb_buffer_stats_by_table documentation: https://dev.mysql.com/doc/refman/8.0/en/sys-innodb-buffer-stats-by-table.html
- MySQL 8.0 INFORMATION_SCHEMA INNODB_BUFFER_PAGE table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-page-table.html
- MySQL 8.0 sys.innodb_buffer_stats_by_schema documentation: https://dev.mysql.com/doc/refman/8.0/en/sys-innodb-buffer-stats-by-schema.html
- MySQL 8.0 InnoDB buffer pool configuration: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 innodb_buffer_pool_instances documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-multiple-buffer-pools.html

## Issues Found
No technical issues found.

## Review Notes
- All eight columns listed for `sys.innodb_buffer_stats_by_table` (`object_schema`, `object_name`, `allocated`, `data`, `pages`, `pages_hashed`, `pages_old`, `rows_cached`) match the official MySQL documentation exactly.
- The `x$innodb_buffer_stats_by_table` variant is correctly described as the raw (non-formatted) counterpart.
- The `information_schema.INNODB_BUFFER_PAGE` query correctly references `TABLE_NAME`, `DATA_SIZE`, and `PAGE_TYPE` columns, all of which exist in that table.
- The `SUM(PAGE_TYPE = 'INDEX')` syntax is valid MySQL for counting boolean expressions.
- The cold-data query properly guards against division by zero with `WHERE pages > 100`.
- `innodb_buffer_pool_instances` is a valid MySQL system variable (deprecated in MySQL 8.0.26+ as the buffer pool is dynamically managed, but still functional). This is a minor version-specific nuance that does not constitute an error.
- `sys.innodb_buffer_stats_by_schema` is correctly referenced as a companion view.
