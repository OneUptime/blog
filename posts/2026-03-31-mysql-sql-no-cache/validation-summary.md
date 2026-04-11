# Validation Summary: How to Use SQL_NO_CACHE in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7 and 8.0)
- SQL_NO_CACHE query modifier
- MySQL Query Cache
- EXPLAIN ANALYZE
- MySQL Performance Schema
- InnoDB Buffer Pool

## Sources Consulted
- MySQL 8.0 Reference Manual: Query Cache Removal — https://dev.mysql.com/doc/refman/8.0/en/query-cache.html
- MySQL 8.0 Reference Manual: SELECT Statement (SQL_NO_CACHE deprecation) — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: EXPLAIN ANALYZE — https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Digests — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-digests.html
- MySQL 8.0 Release Notes (8.0.3) — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-3.html
- MySQL 5.7 Reference Manual: Query Cache — https://dev.mysql.com/doc/refman/5.7/en/query-cache.html

## Issues Found
1. **Incorrect warning message for MySQL 8.0 SQL_NO_CACHE usage**: The post showed the warning as `"Query cache is disabled; to enable it restart MySQL server with query_cache_type=1"`, which is a MySQL 5.x warning that references the `query_cache_type` variable. In MySQL 8.0, this variable does not exist because the query cache was removed entirely. The actual warning in MySQL 8.0.3+ is a deprecation warning: `"1681 - 'SQL_NO_CACHE' is deprecated and will be removed in a future release."` Fixed the warning message and comment accordingly.

2. **Inaccurate claim that SQL_NO_CACHE is "no longer recognized"**: The post stated `SQL_NO_CACHE` is "no longer recognized" in MySQL 8.0, implying a syntax error. In reality, `SQL_NO_CACHE` is deprecated as of MySQL 8.0.3 — it is still parsed by the SQL parser but produces a deprecation warning and has no effect. Changed to accurately describe it as "deprecated as of MySQL 8.0.3."

## Review Notes
- The Performance Schema timer conversion (`avg_timer_wait / 1e9 AS avg_ms`) is correct since statement event timers use picosecond resolution.
- The EXPLAIN ANALYZE version requirement (MySQL 8.0.18+) is accurate.
- The `SELECT * FROM orders LIMIT 0;` example correctly notes it is "not sufficient alone" for flushing buffer pool pages — this is an honest and helpful caveat.
- The reasons given for query cache removal (global mutex, coarse invalidation, write-heavy penalty) are accurate and well-documented in MySQL engineering blog posts.
- The Linux page cache drop command (`echo 3 > /proc/sys/vm/drop_caches`) is correct and properly noted as Linux-only.
