# Validation Summary: How to Use ANALYZE TABLE to Update Index Statistics in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- ANALYZE TABLE statement
- InnoDB index statistics (persistent and transient)
- MySQL query optimizer / EXPLAIN
- SHOW INDEX
- innodb_stats_auto_recalc
- innodb_stats_persistent_sample_pages
- mysql.innodb_index_stats / mysql.innodb_table_stats system tables

## Sources Consulted
- MySQL 8.0 Reference Manual -- ANALYZE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual -- Configuring Persistent Optimizer Statistics Parameters: https://dev.mysql.com/doc/refman/8.0/en/innodb-persistent-stats.html
- MySQL 8.0 Reference Manual -- ALTER TABLE Statement (STATS_SAMPLE_PAGES): https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0.0 Release Notes (removal of innodb_stats_sample_pages): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-0.html

## Issues Found
1. **Deprecated global variable `innodb_stats_sample_pages`**: The post used `SET GLOBAL innodb_stats_sample_pages = 20;` which was deprecated in MySQL 5.6.3 and removed in MySQL 8.0. Changed to `SET GLOBAL innodb_stats_persistent_sample_pages = 20;`, which is the correct variable for persistent statistics (the default mode in modern MySQL).

2. **Incorrect column name in `mysql.innodb_index_stats` example output**: The example output showed `database` as a column name, but the actual column is `database_name`. Corrected the column header and aligned the table formatting accordingly.

## Review Notes
- The post correctly notes that `innodb_stats_auto_recalc` triggers after ~10% of rows change, which matches official documentation.
- The `STATS_SAMPLE_PAGES` per-table ALTER TABLE syntax is correct.
- The ANALYZE TABLE syntax, output format, and multi-table syntax are all accurate.
- The maintenance script approach is functional, though in production environments `mysqlcheck --analyze` could be a simpler alternative for analyzing all tables.
- The post does not specify a target MySQL version. The fixes ensure accuracy for MySQL 8.0+, which is the current mainstream version.
