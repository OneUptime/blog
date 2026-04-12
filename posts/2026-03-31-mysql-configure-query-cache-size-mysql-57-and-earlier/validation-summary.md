# Validation Summary: How to Configure query_cache_size in MySQL 5.7 and Earlier

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 5.7 and earlier
- MySQL query cache (`query_cache_size`, `query_cache_type`, `query_cache_limit`)
- MySQL Performance Schema / Information Schema
- systemd service management

## Sources Consulted
- MySQL 5.7 Reference Manual: Query Cache configuration — https://dev.mysql.com/doc/refman/5.7/en/query-cache-configuration.html
- MySQL 5.7 Reference Manual: Query Cache status and maintenance — https://dev.mysql.com/doc/refman/5.7/en/query-cache-status-and-maintenance.html
- MySQL 5.7 Reference Manual: Server system variables (query_cache_type) — https://dev.mysql.com/doc/refman/5.7/en/server-system-variables.html#sysvar_query_cache_type
- MySQL 5.7 Reference Manual: Performance Schema migration from information_schema — https://dev.mysql.com/doc/refman/5.7/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: Removal of query cache — https://dev.mysql.com/doc/refman/8.0/en/query-cache.html

## Issues Found

1. **`information_schema.GLOBAL_STATUS` deprecated in MySQL 5.7.6+**: The hit rate calculation query used `information_schema.GLOBAL_STATUS`, which is deprecated and disabled by default in MySQL 5.7.6+ (controlled by `show_compatibility_56` system variable, which defaults to OFF). Changed the query to use `performance_schema.global_status` and added a note for users on versions before 5.7.6.

2. **Misleading SQL_NO_CACHE advice for non-deterministic functions**: The post suggested using `SQL_NO_CACHE` for queries containing `NOW()`, `RAND()`, etc. MySQL automatically excludes queries with non-deterministic functions from the query cache, making `SQL_NO_CACHE` unnecessary for those cases. Updated the note to clarify this automatic behavior and reframed `SQL_NO_CACHE` for its actual use cases (deterministic queries you still want to bypass the cache).

3. **Minor historical inaccuracy**: The post stated the query cache "existed in MySQL 5.0 through 5.7". The query cache was actually introduced in MySQL 4.0.1, predating 5.0. Simplified the wording to "was available up through MySQL 5.7" to avoid an incorrect lower bound.

## Review Notes
- The deprecation warning about query cache being removed in MySQL 8.0 is appropriately placed and accurate.
- The `SET GLOBAL query_cache_type = 0` advice for runtime disabling is correct, though it only affects new connections (existing connections retain their session-level value). This nuance is not critical for the tutorial's scope.
- The sizing guidelines (16M-256M) are reasonable general recommendations. Very large query cache sizes (512M+) can cause performance issues due to mutex contention, which aligns with the post's advice to consider application-level caching for high-traffic scenarios.
- The hit rate formula `Qcache_hits / (Qcache_hits + Qcache_inserts)` is a standard and correct approach. A more comprehensive formula would include `Com_select` in the denominator, but the simpler version used here is adequate for this tutorial.
