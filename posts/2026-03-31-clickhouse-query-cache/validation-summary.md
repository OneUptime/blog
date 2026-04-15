# Validation Summary: How to Use query_cache in ClickHouse for Query Result Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (query result caching feature)
- ClickHouse query_cache system settings
- ClickHouse server configuration (config.xml, users.xml)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation on Query Cache: https://clickhouse.com/docs/en/operations/query-cache
- ClickHouse source code (`src/Core/Settings.cpp`) for setting names, types, and defaults
- ClickHouse source code (`src/Common/ProfileEvents.cpp`) for event counter names
- ClickHouse official config.xml reference for server-level query cache configuration
- ClickHouse system tables documentation (`system.query_cache`, `system.events`, `system.metrics`)
- ClickHouse blog post "Introducing the ClickHouse Query Cache" for version history

## Issues Found

1. **Incorrect version number**: The post stated the query cache was introduced in ClickHouse 23.5. It was actually introduced in ClickHouse 23.1 as an experimental preview feature. Changed "23.5" to "23.1".

2. **Wrong XML element name in config.xml**: The post used `<max_entry_rows>` but the correct element name is `<max_entry_size_in_rows>`. Changed to match the official configuration schema.

3. **Deprecated cache clear command**: The post used `SYSTEM DROP QUERY CACHE` which is a deprecated alias. The preferred syntax is `SYSTEM CLEAR QUERY CACHE`. Changed to the recommended form.

4. **Wrong system table reference in summary**: The summary paragraph stated "monitor hit rates via `system.metrics`" but the `QueryCacheHits` and `QueryCacheMisses` counters are in `system.events`. The `system.metrics` table contains gauge values like `QueryCacheEntries` and `QueryCacheBytes` (current cache size), not hit rate counters. Changed to `system.events`.

## Review Notes
- The `query_cache_min_query_duration` setting uses milliseconds as its unit. The blog sets it to 300 (meaning 300ms / 0.3 seconds), which is a valid and reasonable threshold but readers might assume it is in seconds. The blog does not explicitly claim units so this is not an error, but adding a comment about units could help clarity.
- The `query_cache_min_query_runs` default is 0 (cache on first run), while the blog sets it to 2 in the profile example. This is a valid configuration choice, not an error.
- The `normalizeQuery()` function is correctly referenced but note that the query cache key is based on the AST (abstract syntax tree), not just text normalization. Minor whitespace differences may or may not create separate entries depending on how they affect the AST. The blog's statement is a reasonable simplification.
- The `SYSTEM DROP QUERY CACHE` syntax still works as an alias, but the preferred form `SYSTEM CLEAR QUERY CACHE` better communicates intent (clearing vs. disabling).
