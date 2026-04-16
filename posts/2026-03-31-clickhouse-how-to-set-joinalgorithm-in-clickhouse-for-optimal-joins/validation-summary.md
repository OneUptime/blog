# Validation Summary: How to Set join_algorithm in ClickHouse for Optimal Joins

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse join algorithms: `hash`, `parallel_hash`, `partial_merge`, `prefer_partial_merge`, `full_sorting_merge`, `grace_hash`, `direct`, `auto`
- Related settings: `join_algorithm`, `max_bytes_in_join`, `max_threads`, `join_overflow_mode`
- `system.query_log` table

## Sources Consulted
- ClickHouse `Settings.cpp` declaration of `join_algorithm` (default and per-value descriptions): https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp
- ClickHouse `SettingsEnums.cpp` JoinAlgorithm enum values: https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/SettingsEnums.cpp
- ClickHouse blog "Choosing the Right Join Algorithm" (part 5): https://clickhouse.com/blog/clickhouse-fully-supports-joins-how-to-choose-the-right-algorithm-part5
- ClickHouse blog "Hash Join, Parallel Hash Join, Grace Hash Join" (part 2): https://clickhouse.com/blog/clickhouse-fully-supports-joins-hash-joins-part2
- ClickHouse blog "Full Sorting Merge Join, Partial Merge Join" (part 3): https://clickhouse.com/blog/clickhouse-fully-supports-joins-full-sort-partial-merge-part3
- ClickHouse docs: Using JOINs in ClickHouse — https://clickhouse.com/docs/guides/joining-tables

## Issues Found

1. **Incorrect behavior of `auto`** — the post said `auto` starts with hash and "switches to grace_hash if the right table exceeds `max_bytes_in_join`". Per the official `Settings.cpp` description and the ClickHouse "Choosing the Right Join Algorithm" blog post, `auto` starts with hash and switches on the fly to **partial merge join** (not grace_hash) when the memory limit is violated. Corrected both the `Auto Selection` section and the bullet in the "Available Join Algorithms" list.

2. **Incorrect behavior of `prefer_partial_merge`** — the post claimed it uses hash when the right table fits in memory and falls back to partial merge. The official description is the opposite: "ClickHouse always tries to use `partial_merge` join if possible, otherwise, it uses `hash`. *Deprecated*, same as `partial_merge,hash`." Corrected the dedicated section and the bullet in the "Available Join Algorithms" list, and noted that the value is deprecated.

3. **Outdated default-value comment** — the `SELECT getSetting('join_algorithm')` code comment said the result would be `'default'` (and that this selects hash by default). In recent ClickHouse releases the actual default is `direct,parallel_hash,hash` (see `Settings.cpp`). Updated the comment to reflect the current default.

4. **Missing `direct` algorithm** — the original bullet list omitted `direct`, which is one of the supported values (and part of the current default). Added a bullet describing the direct algorithm (lookup into the right table, supported for Dictionary, EmbeddedRocksDB, MergeTree). Also slightly rewrote the other bullets to match the phrasing used in the official setting documentation (for example, `parallel_hash` description and `full_sorting_merge` description).

## Review Notes
- The `default` value is itself deprecated (officially: "Legacy value, please don't use anymore. Same as `direct,hash`"). The post does not recommend setting it explicitly, so no change was required beyond the comment update.
- `max_bytes_in_join = 1073741824` (1 GiB) and `2147483648` (2 GiB) constants are byte-accurate.
- The `system.query_log` query uses `peak_memory_usage` and `type = 'QueryFinish'`, both of which are correct column names and enum values.
- The decision-guide table is a reasonable heuristic rather than an official recommendation; it is presented as guidance, which is acceptable.
- `join_overflow_mode` values `'throw'` and `'break'` are correct.
