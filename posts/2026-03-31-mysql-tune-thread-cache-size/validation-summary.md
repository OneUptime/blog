# Validation Summary: How to Tune thread_cache_size for MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL 8.0
- MySQL thread caching (thread_cache_size, thread_stack)
- MySQL performance_schema
- MySQL connection management
- Connection pooling (ProxySQL, HikariCP)

## Sources Consulted
- [MySQL 8.0 Reference Manual: Server System Variables](https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html) — verified thread_cache_size auto-sizing formula and thread_stack default values
- [MySQL 8.0 Reference Manual: Connection Interfaces](https://dev.mysql.com/doc/refman/8.0/en/connection-interfaces.html) — verified thread caching behavior and thread_cache_size auto-sizing
- [MySQL Connection Handling and Scaling (MySQL Blog)](https://dev.mysql.com/blog-archive/mysql-connection-handling-and-scaling/) — verified connection handling architecture and thread cache recommendations
- [MySQL Server Version Reference: Option and Variable Changes for 8.0](https://dev.mysql.com/doc/mysqld-version-reference/en/optvar-changes-8-0.html) — verified thread_stack default change to 1MB in MySQL 8.0.27+

## Issues Found
No technical issues found.

## Review Notes
- The `thread_stack` default of 1MB on 64-bit systems is correct for MySQL 8.0.27 and later. Prior to 8.0.27, the default was 286720 bytes (~280KB). The post does not specify a sub-version, but the 1MB value is accurate for current MySQL 8.0 releases.
- The `thread_cache_size` auto-sizing formula `8 + (max_connections / 100)` is capped at 100 in some MySQL versions (documented in MySQL 5.7). The post does not mention this cap, but its example (max_connections=300, resulting in 11) is well below the cap and is correct.
- The reference to "pgBouncer equivalent" is slightly unusual since pgBouncer is PostgreSQL-specific, but the intent is clear (a MySQL connection pooler analogous to pgBouncer), and ProxySQL is correctly listed as an actual MySQL option.
- The `FLUSH STATUS` command resets most status counters but the specific behavior varies by variable. For `Threads_created`, this is a standard approach for re-baselining after configuration changes.
