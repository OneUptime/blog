# Validation Summary: What Is INFORMATION_SCHEMA in MySQL

## Status
validated

## Post Type
Reference

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA virtual database
- InnoDB storage engine
- Performance Schema (after fix)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA Tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: data_locks Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual: data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Migration Guide: Removed Features — https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html

## Issues Found
- **INNODB_LOCKS and INNODB_LOCK_WAITS tables removed in MySQL 8.0**: The post referenced `information_schema.INNODB_LOCKS` and `information_schema.INNODB_LOCK_WAITS`. These tables were deprecated in MySQL 5.7.14 and removed entirely in MySQL 8.0. Since MySQL 5.7 reached end-of-life in October 2023, the post should use the current replacements. Changed to `performance_schema.data_locks` and `performance_schema.data_lock_waits` respectively, with a `(MySQL 8.0+)` annotation in the SQL comments.

## Review Notes
- The `TABLE_ROWS` value from `information_schema.TABLES` is an estimate for InnoDB tables (based on sampling), not an exact count. The post doesn't claim it's exact, but readers should be aware of this nuance.
- `INNODB_TRX` remains in INFORMATION_SCHEMA in MySQL 8.0 and is correct as written.
- All other SQL queries use correct column names and table references verified against MySQL 8.0 documentation.
- The SHOW vs INFORMATION_SCHEMA comparison is accurate — SHOW statements are indeed often internally translated to INFORMATION_SCHEMA queries.
