# Validation Summary: How to Configure query_cache_size (MySQL 5.7 and Earlier)

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 5.7 (query cache feature)
- MySQL 8.0 (removal context)
- Redis (application-level caching alternative)
- Python (`redis` and `mysql.connector` libraries)

## Sources Consulted
- MySQL 5.7 Reference Manual: Server System Variables — query_cache_size, query_cache_type, query_cache_limit (https://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html)
- MySQL 5.7 Reference Manual: The MySQL Query Cache (https://dev.mysql.com/doc/refman/5.7/en/query-cache.html)
- MySQL 5.7 Reference Manual: Server Status Variables — Qcache_hits, Qcache_inserts, etc. (https://dev.mysql.com/doc/refman/5.7/en/server-status-variables.html)
- MySQL 5.7 Reference Manual: Performance Schema status variable tables vs information_schema (https://dev.mysql.com/doc/refman/5.7/en/performance-schema-status-variable-tables.html)
- MySQL 8.0 Reference Manual: Removal of query cache (https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html)

## Issues Found

1. **`query_cache_strip_comments` in example output**: The `SHOW VARIABLES LIKE 'query_cache%'` example output included `query_cache_strip_comments`, which is a Percona Server extension, not a standard Oracle MySQL 5.7 variable. Removed it from the example output to avoid confusion for readers using standard MySQL.

2. **`information_schema.GLOBAL_STATUS` in hit rate query**: The query used `information_schema.GLOBAL_STATUS` to calculate the cache hit rate. In MySQL 5.7.9+, the system variable `show_compatibility_56` defaults to `OFF`, which disables `information_schema.GLOBAL_STATUS` and returns an error. Changed to `performance_schema.global_status`, which is the correct and default-accessible table for MySQL 5.7.9+.

## Review Notes
- The deprecation notice (MySQL 5.7.20) and removal notice (MySQL 8.0) are accurate and prominently placed, which is good.
- The `query_cache_size` default in standard MySQL 5.7 is actually 1048576 (1MB), not 0 as shown in the example output. However, the output is clearly example data from a specific server, and 0 is a valid configured value, so this is not an error.
- The Python code example does not close the MySQL connection after use. This is acceptable for a simplified illustration but not production-ready.
- The 80% hit rate threshold is a reasonable rule of thumb, though it is not an official MySQL recommendation.
- All other technical claims (mutex contention, per-table invalidation, query_cache_type modes, SQL_CACHE/SQL_NO_CACHE hints) are accurate.
