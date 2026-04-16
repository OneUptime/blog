# Validation Summary: How to Use Query Cache in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (query cache feature)
- SQL (SETTINGS, SYSTEM statements)
- ClickHouse server XML configuration (config.d / users.d)

## Sources Consulted
- [ClickHouse Docs — Query cache](https://clickhouse.com/docs/en/operations/query-cache)
- [ClickHouse Docs — system.query_cache](https://clickhouse.com/docs/en/operations/system-tables/query_cache)
- [ClickHouse Docs — SYSTEM statements](https://clickhouse.com/docs/en/sql-reference/statements/system)
- [ClickHouse Release 23.1 announcement (Jan 30, 2023)](https://clickhouse.com/blog/clickhouse-release-23-01)
- [ClickHouse blog — Introducing the Query Cache](https://clickhouse.com/blog/introduction-to-the-clickhouse-query-cache-and-design)
- [PR #43797 — Query result cache \[experimental\]](https://github.com/ClickHouse/ClickHouse/pull/43797) (landed in 23.1)
- [PR #56519 — Query cache: Allow to ignore non-deterministic queries](https://github.com/ClickHouse/ClickHouse/pull/56519) (introduced `query_cache_nondeterministic_function_handling`)
- ClickHouse source: `src/Parsers/ParserSystemQuery.cpp` and `src/Interpreters/InterpreterSystemQuery.cpp` (confirms `DROP QUERY CACHE` is a recognized alias for `CLEAR QUERY CACHE`, and that the command accepts only an optional `TAG`)

## Issues Found

1. **Incorrect introduction version.** The post stated the query cache was introduced in ClickHouse 22.7. The query result cache was actually introduced in ClickHouse **23.1** (released January 30, 2023, PR #43797). Updated both the "What Is the ClickHouse Query Cache?" intro and the Summary.

2. **Invalid `SYSTEM DROP QUERY CACHE` argument.** The post showed `SYSTEM DROP QUERY CACHE 'SELECT count() FROM events WHERE date = today()';`. The command does not accept a query text argument. The only optional argument is `TAG '<tag_value>'`. Replaced the example with `SYSTEM DROP QUERY CACHE TAG 'dashboard';`.

3. **Non-existent `hits` column in `system.query_cache`.** The post's inspection query selected and ordered by a `hits` column, which is not part of the `system.query_cache` schema. Actual columns are `query`, `query_id`, `result_size`, `tag`, `stale`, `shared`, `compressed`, `expires_at`, `key_hash`. Replaced `hits` with `expires_at`.

4. **Obsolete setting `query_cache_store_results_of_queries_with_nondeterministic_functions`.** This setting has been superseded by `query_cache_nondeterministic_function_handling`, which takes an enum value of `'throw'` (default), `'save'`, or `'ignore'` instead of `0`/`1`. Updated the three places where the old setting appeared (Passive vs Active section, Non-Deterministic Functions section, and the Dashboard example) to use the current setting and its string-valued options.

## Review Notes

- `SYSTEM DROP QUERY CACHE` is still a valid deprecated alias for `SYSTEM CLEAR QUERY CACHE` in the parser, so retaining the existing `DROP` phrasing keeps the examples working. The official docs now favor `CLEAR`, so a future revision could switch to that phrasing.
- The server-side `<query_cache>` XML keys (`max_size_in_bytes`, `max_entries`, `max_entry_size_in_bytes`, `max_entry_size_in_rows`) match the official documentation.
- All SETTINGS names used after the fixes (`use_query_cache`, `query_cache_ttl`, `enable_writes_to_query_cache`, `query_cache_share_between_users`, `query_cache_nondeterministic_function_handling`) are current.
- The `query_cache_share_between_users` caveat in the post is accurate — it can bypass row-level isolation and should only be used when entries are truly user-agnostic.
