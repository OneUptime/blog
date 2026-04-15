# Validation Summary: How to Use Query Result Caching in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (query result cache feature)
- ClickHouse SQL (SELECT with SETTINGS, SYSTEM commands, CREATE SETTINGS PROFILE)
- ClickHouse server configuration (config.xml)

## Sources Consulted
- ClickHouse official documentation: Query Cache — https://clickhouse.com/docs/en/operations/query-cache
- ClickHouse official documentation: Server Settings (query_cache) — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#query_cache
- ClickHouse official documentation: system.query_cache table — https://clickhouse.com/docs/en/operations/system-tables/query_cache
- ClickHouse official documentation: SYSTEM statements — https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse official documentation: Settings Profiles — https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse blog: Introducing the ClickHouse Query Cache — https://clickhouse.com/blog/introduction-to-the-clickhouse-query-cache-and-design

## Issues Found

1. **Incorrect version number (line 11, 135)**: The post claimed "23.2+" but the query cache was introduced in ClickHouse v23.1. Changed to "23.1+".

2. **Nondeterministic functions in cached query examples (lines 35, 50)**: The "Use Cache Per Query" example used `now()` and the "Set Cache TTL" example used `today()` with `use_query_cache = true`, but ClickHouse does not cache queries containing nondeterministic functions by default (controlled by `query_cache_nondeterministic_function_handling`, which defaults to `throw` in recent versions). Added `query_cache_nondeterministic_function_handling = 'save'` to both SETTINGS clauses to make the examples work correctly.

3. **Misleading "When Not to Use Cache" comment (line 121-122)**: The original comment "Queries with nondeterministic functions won't benefit" was inaccurate — the real behavior is that they are not cached by default, but can be explicitly cached with `query_cache_nondeterministic_function_handling = 'save'`. Updated the comment to explain the default behavior and the opt-in mechanism.

## Review Notes
- The config.xml element names (`max_size_in_bytes`, `max_entries`, `max_entry_size_in_bytes`, `max_entry_size_in_rows`) are all correct.
- The `system.query_cache` table columns (`query`, `result_size`, `stale`, `shared`, `expires_at`) are all verified to exist.
- The `SYSTEM DROP QUERY CACHE` syntax is correct (both DROP and CLEAR variants are accepted).
- The `enable_writes_to_query_cache`/`enable_reads_from_query_cache` pattern for forcing a cache refresh is a valid and documented approach.
- The `query_cache_share_between_users` setting name is correct.
- The `CREATE SETTINGS PROFILE` and `ALTER USER ... SETTINGS PROFILE` syntax are both valid.
- The `query_cache_nondeterministic_function_handling` setting was introduced in later ClickHouse versions (around 24.x). In earlier 23.x versions, the equivalent boolean setting `query_cache_store_results_of_queries_with_nondeterministic_functions` controlled this behavior. Users on older 23.x versions may need to use the older setting name.
