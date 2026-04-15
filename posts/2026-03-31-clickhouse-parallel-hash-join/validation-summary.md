# Validation Summary: How to Use Parallel Hash Join in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse join algorithms (`parallel_hash`, `hash`, `grace_hash`, `full_sorting_merge`, `direct`)
- ClickHouse `system.query_log` system table
- ClickHouse server configuration (`users.xml` profiles)

## Sources Consulted
- ClickHouse official documentation: `join_algorithm` setting — https://clickhouse.com/docs/en/operations/settings/settings#join_algorithm
- ClickHouse official documentation: system.query_log — https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official blog series on join algorithms (Part 2: Hash Join, Parallel Hash Join, Grace Hash Join) — https://clickhouse.com/blog/clickhouse-fully-supports-joins-hash-joins-part2
- ClickHouse source code: `SettingsEnums.cpp` for the full list of valid `join_algorithm` enum values

## Issues Found

1. **`hash` mislabeled as the default join algorithm (line 16)**: The post listed `hash` as "(default)". The actual default value of `join_algorithm` is `default`, which auto-selects between `direct` and `hash` depending on join type, strictness, and table engine. Fixed by adding the `default` and `auto` entries to the list and removing "(default)" from `hash`.

2. **Incomplete join algorithm list (lines 15-20)**: The post listed only 5 of the 9 valid `join_algorithm` values. It was missing `default`, `auto`, and `partial_merge` (also `prefer_partial_merge`, omitted as it is less commonly referenced). Added the missing significant algorithms to the list.

3. **Incorrect claim about "default: 16 buckets" (line 57)**: The post stated that parallel hash join splits data into buckets with a "default: 16". In reality, the number of buckets (concurrent hash tables) is determined by the `max_threads` setting, not a fixed default of 16. Fixed by replacing the hardcoded "16" with a reference to `max_threads`.

## Review Notes
- The post omits `prefer_partial_merge` from the algorithms list. This is a minor omission as it is a less commonly used variant and the post is focused on parallel hash join specifically.
- The benchmark claim of "4-8x speedup" is presented as a general observation. Actual speedup varies significantly depending on hardware, data characteristics, and query patterns. The claim is reasonable for typical multi-core servers but is not a guaranteed figure.
- The `system.query_log` query example is correct — all column names (`query`, `memory_usage`, `query_duration_ms`) are verified to exist in the schema.
- The SQL syntax throughout the post is valid ClickHouse SQL.
- The `users.xml` profile configuration format is correct per ClickHouse documentation.
