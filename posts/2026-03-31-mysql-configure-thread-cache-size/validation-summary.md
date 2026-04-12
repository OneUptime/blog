# Validation Summary: How to Configure thread_cache_size in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- MySQL thread_cache_size system variable
- MySQL performance_schema
- ProxySQL connection pooler
- MySQL Enterprise Thread Pool plugin

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (thread_cache_size) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_thread_cache_size
- MySQL 8.0 Reference Manual: Server Status Variables (Threads_created, Threads_cached, Connections) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: Performance Schema status variable tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: Migrating from information_schema to performance_schema for status variables — https://dev.mysql.com/doc/refman/8.0/en/migrating-to-performance-schema.html
- MySQL 8.0 Reference Manual: Thread Pool — https://dev.mysql.com/doc/refman/8.0/en/thread-pool.html

## Issues Found

1. **information_schema.GLOBAL_STATUS used instead of performance_schema.global_status**: The cache hit rate query and the monitoring shell script both referenced `information_schema.GLOBAL_STATUS`. In MySQL 8.0 (which the post explicitly targets), this table was removed and replaced by `performance_schema.global_status`. The `show_compatibility_56` variable that previously allowed access to the information_schema version was also removed in MySQL 8.0. Fixed both queries to use `performance_schema.global_status`.

2. **PgBouncer mentioned in a MySQL article**: The "Thread Cache vs Connection Pool" section mentioned PgBouncer alongside ProxySQL as a connection pooler option, with a parenthetical "(for MySQL, ProxySQL)". PgBouncer is a PostgreSQL-only connection pooler and does not work with MySQL. This reference was confusing and misleading. Removed the PgBouncer mention, leaving only ProxySQL as the recommended MySQL connection pooler.

## Review Notes
- The default value formula `8 + (max_connections / 100)` is correct and is capped at 100 per the MySQL 8.0 documentation. The post does not mention the cap, which could be noted in a future update.
- The recommended values table provides reasonable guidelines but these are community best practices rather than official MySQL recommendations.
- The `thread_handling` variable and its default value `one-thread-per-connection` are accurately described. The Thread Pool plugin is correctly identified as a MySQL Enterprise feature.
