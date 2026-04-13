# Validation Summary: How to Cache Queries with ProxySQL for MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ProxySQL (query cache feature)
- MySQL

## Sources Consulted
- ProxySQL official documentation: https://proxysql.com/documentation/query-cache/
- ProxySQL GitHub source code and documentation: https://github.com/sysown/proxysql (specifically `doc/query_cache.md`, `lib/ProxySQL_Admin.cpp` for table schema and CHECK constraints)
- ProxySQL `mysql_query_rules` table definition and column constraints in source code
- ProxySQL `stats_mysql_global` variable definitions in official docs

## Issues Found

1. **`Query_Cache_bytes_IN` and `Query_Cache_bytes_OUT` descriptions were swapped.** The post described `bytes_IN` as "bytes read from cache" and `bytes_OUT` as "bytes written to cache". Per the official documentation, `bytes_IN` refers to bytes written *into* the cache and `bytes_OUT` refers to bytes read *from* the cache. Fixed by swapping the descriptions.

2. **`cache_ttl=0` violates ProxySQL's CHECK constraint.** The post recommended setting `cache_ttl=0` to bypass caching for specific users. However, the `cache_ttl` column has a `CHECK(cache_ttl > 0)` constraint, so inserting a value of 0 would be rejected. Fixed by removing `cache_ttl` from the INSERT entirely and relying on `apply=1` to stop rule evaluation before any caching rule is reached.

3. **ProxySQL 2.x has `PROXYSQL FLUSH QUERY CACHE`.** The post claimed ProxySQL does not expose a direct flush command. This was true for v1.x but is incorrect for the current v2.x releases, which support `PROXYSQL FLUSH QUERY CACHE`. Fixed by replacing the section with the correct command.

4. **`LOAD MYSQL VARIABLES TO RUNTIME` does not purge cache entries.** The post claimed this command could be used to "purge in-flight entries." Examination of the source code shows this function updates global variables but does not call the cache flush method. Removed this incorrect claim.

5. **`mysql-query_cache_size_MB` is a soft limit, not a hard maximum.** The post described it as "the maximum memory allocated to the cache." Per the official documentation, this value is used as a threshold by the purging thread — it does not impose a hard memory cap. Fixed the description to clarify it is a soft limit.

## Review Notes
- The post uses `match_pattern` with regex for cache rules. While this works, the official ProxySQL documentation examples for caching typically use `match_digest` or `digest` for more efficient matching. This is a stylistic choice rather than an error.
- The post omits some available cache metrics (`Query_Cache_Memory_bytes`, `Query_Cache_Entries`) that could be useful for monitoring. Not an error, but worth noting for future improvement.
