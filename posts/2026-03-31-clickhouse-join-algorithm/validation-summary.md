# Validation Summary: How to Configure join_algorithm Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (SQL query engine)
- ClickHouse `join_algorithm` setting and related join settings (`max_bytes_in_join`, `grace_hash_join_initial_buckets`, `join_overflow_mode`)
- ClickHouse system tables (`system.settings`, `system.query_log`)
- ClickHouse XML user profile configuration
- Mermaid diagrams
- SQL JOIN syntax

## Sources Consulted
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings#join_algorithm
- ClickHouse JOIN tables guide: https://clickhouse.com/docs/guides/joining-tables
- ClickHouse EXPLAIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse system.query_log reference: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found

1. **Invalid `merge` algorithm value** — The mermaid diagram and comparison table listed a bare `merge` algorithm, which is not a valid value for `join_algorithm`. ClickHouse only accepts `partial_merge` and `full_sorting_merge` (in addition to `hash`, `parallel_hash`, `grace_hash`, `direct`, `auto`, `default`, and `prefer_partial_merge`). Replaced the duplicated/invalid `merge` entry in the mermaid diagram with `direct` (a real algorithm that was missing), and replaced the `merge` row in the comparison table with `full_sorting_merge`. Also updated the summary paragraph to reference `full sorting merge` instead of a bare `merge`.

2. **Incorrect `auto` mode fallback algorithm** — The post stated that `auto` mode starts with hash join and "switches to `grace_hash` if the hash table exceeds `max_bytes_in_join`". Per the official ClickHouse joining-tables guide, `auto` falls back to `partial_merge`, not `grace_hash`. Corrected the description to say it switches on the fly to `partial_merge`.

## Review Notes

- The default value of `join_algorithm` has historically changed across ClickHouse versions. In recent versions (23.x+) the default includes `direct,parallel_hash,hash` as a list of algorithms tried in order. The post describes `hash` as the "default behavior" in a code comment, which is approximately correct but slightly simplified — hash is generally what gets used for non-dictionary joins under the default setting.
- The XML profile snippet is valid for `users.xml`-style configuration. Administrators using YAML-style configuration would need to translate the structure accordingly.
- `grace_hash_join_initial_buckets = 16` is a reasonable example value; the actual default has varied by version.
- The `system.query_log` example assumes the query log is enabled (default in most installations).
- No changes were made to code style, tone, or structure beyond fixing the two technical inaccuracies above.
