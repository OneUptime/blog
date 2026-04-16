# Validation Summary: ClickHouse JOIN Algorithms Feature Comparison

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- ClickHouse (JOIN engine and `join_algorithm` setting)
- SQL (ClickHouse dialect)
- Join algorithms: hash, parallel_hash, partial_merge, grace_hash, auto

## Sources Consulted
- ClickHouse JOIN algorithm reference: https://clickhouse.com/docs/en/operations/settings/settings#join_algorithm
- ClickHouse SQL JOIN clause: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse blog post on grace hash join: https://clickhouse.com/blog/clickhouse-fully-supports-joins-hash-joins-part2
- ClickHouse settings: `default_max_bytes_in_join`, `grace_hash_join_initial_buckets`
- ClickHouse `system.processes` table reference: https://clickhouse.com/docs/en/operations/system-tables/processes

## Issues Found
- **Incorrect limitation for `grace_hash` in the overview table**: The original table listed "Requires sorted input" as the limitation for `grace_hash`. This is wrong — `grace_hash` partitions both sides by the hash of the join key and does not require sorted input (sorted input is associated with `partial_merge`/`full_sorting_merge`, not grace hash). Replaced with "Slower than hash for small data", which is the actual practical limitation.

## Review Notes
- Setting names verified: `join_algorithm`, `default_max_bytes_in_join`, and `grace_hash_join_initial_buckets` are all valid ClickHouse settings.
- The `auto` algorithm description (start with hash, fall back to `partial_merge` on memory limits) reflects the documented behavior. Note that more recent ClickHouse versions also accept multi-value lists for `join_algorithm` (e.g., `'parallel_hash,partial_merge'`) for finer control, but the post's simpler `'auto'` example remains valid.
- The `system.processes` query is correct; `memory_usage` is a real column there. For historical analysis, `system.query_log` with `memory_usage` is also useful (out of scope here).
- The claim that `parallel_hash` has "similar" memory footprint to `hash` is accurate in practice but can be slightly higher due to per-partition overhead — fine for this overview.
