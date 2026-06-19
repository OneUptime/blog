# Validation Summary: How to Configure MySQL Query Cache (Deprecated)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MySQL 5.7 Query Cache
- MySQL 8.0 migration and optimizer features
- InnoDB buffer pool
- Redis application-level caching
- ProxySQL query caching
- Bash configuration checks
- Python mysql-connector and redis clients

## Sources Consulted
- MySQL 5.7 Reference Manual: Query Cache Configuration - https://dev.mysql.com/doc/refman/5.7/en/query-cache-configuration.html
- MySQL 5.7 Reference Manual: Server System Variables - https://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html
- MySQL 5.7 Reference Manual: Server Status Variables - https://dev.mysql.com/doc/refman/5.7/en/server-status-variables.html
- MySQL 5.7 Reference Manual: Migrating to Performance Schema System and Status Variable Tables - https://dev.mysql.com/doc/refman/5.7/en/performance-schema-variable-table-migration.html
- MySQL 8.0 Reference Manual: Block Nested-Loop and Batched Key Access Joins - https://dev.mysql.com/doc/refman/8.0/en/bnl-bka-optimization.html
- MySQL 8.0 Reference Manual: EXPLAIN Statement - https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement / Index Visibility - https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- ProxySQL Documentation: Query Cache - https://proxysql.com/documentation/query-cache/

## Issues Found
- The query-cache hit ratio and buffer-pool hit ratio examples selected from `information_schema.GLOBAL_STATUS`. In MySQL 5.7.6 and later, those `INFORMATION_SCHEMA` status tables are deprecated and can produce errors when `show_compatibility_56` is off. Updated the examples to use Performance Schema sources.
- The MySQL 8.0 hash join example used `SET optimizer_switch = 'hash_join=on';`. MySQL 8.0 controls hash join use through the `block_nested_loop` optimizer switch in 8.0.18 and later, and in 8.0.20+ that flag controls hash joins only. Updated the example to use `block_nested_loop=on`.

## Review Notes
The post is intentionally legacy-focused. Query Cache variables and `SQL_CACHE` / `SQL_NO_CACHE` are deprecated in MySQL 5.7.20 and removed in MySQL 8.0, so the legacy examples should only be used on supported MySQL 5.7 deployments before migration.
