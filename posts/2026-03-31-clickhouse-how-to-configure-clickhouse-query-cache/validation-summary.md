# Validation Summary: How to Configure ClickHouse Query Cache

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (query cache, system tables, SYSTEM commands)
- ClickHouse server XML configuration
- SQL SETTINGS clause

## Sources Consulted
- [ClickHouse Query Cache documentation](https://clickhouse.com/docs/operations/query-cache)
- [ClickHouse 23.1 Release Notes](https://clickhouse.com/blog/clickhouse-release-23-01)
- [Introducing the ClickHouse Query Cache (official blog)](https://clickhouse.com/blog/introduction-to-the-clickhouse-query-cache-and-design)
- [PR #56519: Query cache: Allow to ignore non-deterministic queries](https://github.com/ClickHouse/ClickHouse/pull/56519)
- [PR #68477: Drop query cache by tag](https://github.com/ClickHouse/ClickHouse/pull/68477)

## Issues Found
1. **Incorrect version of introduction.** The post stated the query cache was introduced in "version 22.4". It was actually introduced in **23.1** (January 2023). Fixed.
2. **Incorrect configuration field name.** The XML config used `<max_entry_rows_in_rows>`, which is not a valid ClickHouse config key. The correct field name is **`max_entry_size_in_rows`**. Fixed.
3. **Incorrect "Bypassing the Cache" example.** The post used `query_cache_nondeterministic_function_handling = 'save'` to illustrate "forcing re-execution even if a cached result exists". That setting does not bypass the cache — it controls whether results of queries containing non-deterministic functions (e.g. `now()`, `rand()`) are cached at all (values: `throw` (default), `save`, `ignore`). Replaced with `enable_reads_from_query_cache = 0`, which correctly forces re-execution while still allowing writes to the cache.
4. **Unsupported `SYSTEM DROP QUERY CACHE WHERE ...` syntax.** ClickHouse does not support a `WHERE` clause on `SYSTEM DROP QUERY CACHE`. Granular invalidation is supported via tags: `SYSTEM DROP QUERY CACHE TAG '<tag>'` (after tagging queries with `query_cache_tag`). Fixed the example to use the tag-based syntax.

## Review Notes
- `query_cache_ttl` defaults to 60 seconds if not explicitly specified — the post does not mention this default but it is not incorrect.
- The `system.query_cache` table and `QueryCacheHits`/`QueryCacheMisses` ProfileEvents are accurate.
- `SET use_query_cache = 1` at session level is valid.
- `query_cache_share_between_users = 1` is correctly described; by default cached results are per-user for security reasons.
- `SYSTEM CLEAR QUERY CACHE` is an alias for `SYSTEM DROP QUERY CACHE`; the post uses the `DROP` form which remains valid.
