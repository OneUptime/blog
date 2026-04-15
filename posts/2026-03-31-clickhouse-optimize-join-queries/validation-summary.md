# Validation Summary: How to Optimize JOIN Queries in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL dialect, join engine, dictionary engine)
- ClickHouse join algorithms (hash, parallel_hash, partial_merge, grace_hash, direct)
- ClickHouse dictionaries (HASHED layout, dictGet function)
- ASOF JOIN

## Sources Consulted
- ClickHouse JOIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse join_algorithm setting: https://clickhouse.com/docs/en/operations/settings/settings#join_algorithm
- ClickHouse dictionaries documentation: https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse dictGet function: https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse ASOF JOIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join#asof-join
- ClickHouse v24.11 changelog (default join_algorithm changed to parallel_hash)

## Issues Found

### Issue 1: Default join algorithm is outdated
- **What was wrong:** Line 56 marked `hash` as the default join algorithm (`SET join_algorithm = 'hash'; -- default, good for small right tables`). Since ClickHouse v24.11 (November 2024), the default was changed to `parallel_hash`.
- **What was changed:** Updated the comment to remove the "default" label from `hash` and added a separate line for `parallel_hash` noting it is the default since v24.11.

### Issue 2: Incorrect recommendation of `direct` join algorithm for range joins
- **What was wrong:** The "Avoid Non-Equi Joins" section recommended using `SET join_algorithm = 'direct'` for range/non-equi joins. The `direct` algorithm is designed for dictionary-backed key-value lookups (and tables like EmbeddedRocksDB or Join table engine), not for range joins. It only supports exact key matching with `ANY` strictness and `INNER`/`LEFT` join types.
- **What was changed:** Replaced the incorrect `direct` algorithm recommendation with guidance to use `ASOF JOIN` for time-range conditions, which is ClickHouse's purpose-built mechanism for efficiently matching on the closest value. Added a practical SQL example demonstrating ASOF JOIN usage.

## Review Notes
- The list of join algorithms shown in the "Choose the Right Join Algorithm" section is intentionally non-exhaustive. Other valid values include `direct`, `full_sorting_merge`, and `auto`. This is acceptable for a guide focused on the most common scenarios.
- The `join_default_strictness` setting defaults to `ALL`, confirming the post's claim that ANY JOIN avoids the default ALL behavior. However, this setting can be changed server-wide, which the post does not mention.
- Dictionary syntax (CREATE DICTIONARY, LAYOUT, SOURCE, LIFETIME, dictGet) was verified as correct.
- The advice to put smaller tables on the right side is accurate for the hash-based join algorithms but less relevant when using `parallel_hash` (the new default) or `grace_hash`, which handle memory more efficiently. The post's guidance is still sound as a general best practice.
