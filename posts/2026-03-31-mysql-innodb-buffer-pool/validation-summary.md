# Validation Summary: How to Optimize MySQL Queries with InnoDB Buffer Pool

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB Buffer Pool
- performance_schema
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: innodb_buffer_pool_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_size
- MySQL 8.0 Reference Manual: innodb_buffer_pool_instances — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_instances
- MySQL 8.0 Reference Manual: innodb_buffer_pool_load_at_startup — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_load_at_startup
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual: Saving and Restoring the Buffer Pool State — https://dev.mysql.com/doc/refman/8.0/en/innodb-preload-buffer-pool.html

## Issues Found

1. **Incorrect hit_rate percentage calculation in INNODB_BUFFER_POOL_STATS query**: The query used `hit_rate / 1000.0 AS hit_rate_pct`, but the `hit_rate` column in `INNODB_BUFFER_POOL_STATS` is expressed per 1000 (e.g., 998 means 99.8%). Dividing by 1000.0 yields 0.998 (a ratio), not a percentage. Changed to `hit_rate / 10.0 AS hit_rate_pct` so that 998 correctly produces 99.8%.

2. **SET GLOBAL used on a non-dynamic variable**: The post used `SET GLOBAL innodb_buffer_pool_load_at_startup = ON;`, but `innodb_buffer_pool_load_at_startup` is not a dynamic variable (Dynamic: No per MySQL docs). Attempting to SET GLOBAL on it would produce an error: "Variable 'innodb_buffer_pool_load_at_startup' is a read only variable." Changed to a comment explaining it must be set in my.cnf instead.

## Review Notes
- The `innodb_buffer_pool_instances` default is listed as "8 (MySQL 8.0)" in the configuration table. The documented default is indeed 8, but MySQL automatically adjusts it to 1 when `innodb_buffer_pool_size` is less than 1GB. The example output correctly shows 1 (since the default pool is 128MB). This is not incorrect but could be clarified in a future revision.
- All SQL syntax, status variable names, INFORMATION_SCHEMA column names, and performance_schema queries are correct.
- The 60-80% RAM recommendation, LRU eviction description, dynamic resizing (5.7.5+), and buffer pool dump/restore features are all accurately described.
