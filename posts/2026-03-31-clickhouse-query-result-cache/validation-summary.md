# Validation Summary: How to Use Query Result Cache in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (query result cache feature)
- SQL (ClickHouse SQL dialect)
- ClickHouse configuration (config.xml, users.xml)

## Sources Consulted
- ClickHouse Query Cache documentation: https://clickhouse.com/docs/en/operations/query-cache
- ClickHouse system.query_cache table documentation: https://clickhouse.com/docs/en/operations/system-tables/query_cache

## Issues Found
1. **Incorrect SYSTEM command for clearing the query cache (line 108):** The post used `SYSTEM DROP QUERY CACHE` but the correct command per the official ClickHouse documentation is `SYSTEM CLEAR QUERY CACHE`. Fixed to `SYSTEM CLEAR QUERY CACHE`.

## Review Notes
- The `max_entry_size_in_bytes` configuration example uses 10 MB (10485760). The ClickHouse default is 1 MB (1048576). The post is showing a custom configuration, not claiming this is the default, so this is not an error — but readers should be aware the default is lower.
- All setting names (`use_query_cache`, `query_cache_ttl`, `enable_writes_to_query_cache`, `enable_reads_from_query_cache`) are confirmed correct.
- The `system.query_cache` table columns (`query`, `result_size`, `stale`, `shared`, `expires_at`) are all confirmed correct.
- ProfileEvents names (`QueryCacheHits`, `QueryCacheMisses`) are confirmed correct.
- The query cache matches on the AST level (not raw query text), making it case-insensitive and whitespace-tolerant. The post doesn't mention this nuance but it's not an error.
- By default, queries with non-deterministic functions (e.g., `now()`, `rand()`) are not cached. This is not mentioned in the post but would be a useful addition in a future revision.
