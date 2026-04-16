# Validation Summary: How to Use Grace Hash Join in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse JOIN algorithms (hash, parallel_hash, grace_hash, partial_merge)
- ClickHouse system.query_log
- ClickHouse query settings (`join_algorithm`, `max_memory_usage`, `grace_hash_join_initial_buckets`)

## Sources Consulted
- [ClickHouse Docs — Using JOINs in ClickHouse](https://clickhouse.com/docs/guides/joining-tables)
- [ClickHouse Blog — Hash Joins, Parallel Hash Joins, Grace Hash Joins (Part 2)](https://clickhouse.com/blog/clickhouse-fully-supports-joins-hash-joins-part2)
- [ClickHouse Blog — Choosing the Right Join Algorithm (Part 5)](https://clickhouse.com/blog/clickhouse-fully-supports-joins-how-to-choose-the-right-algorithm-part5)
- [ClickHouse Docs — Settings (join_algorithm, grace_hash_join_initial_buckets)](https://clickhouse.com/docs/operations/settings/settings)

## Issues Found
- **Incorrect fallback behavior of `join_algorithm = 'auto'`.** The post originally claimed: "With `auto`, ClickHouse starts with hash join and falls back to grace hash join if the right-side table exceeds the memory limit." This is incorrect per the official ClickHouse documentation and the official ClickHouse engineering blog (Part 5 — "Choosing the Right Join Algorithm"), which explicitly state: *"ClickHouse tries the hash join algorithm first, and if that algorithm's memory limit is violated, the algorithm is switched on the fly to partial merge join."* The fallback is to **partial merge join**, not grace hash join. Updated the relevant paragraph and the Summary to state the correct fallback behavior and to recommend setting `join_algorithm = 'grace_hash'` explicitly (or using a comma-separated list like `'hash,grace_hash'`) when memory-safe grace-hash behavior is desired.

## Review Notes
- Grace Hash Join was introduced in ClickHouse 22.12. The post does not mention a minimum version; users on older releases should upgrade.
- The setting `grace_hash_join_initial_buckets` is rounded up to the nearest power of two (e.g., setting 3 yields 4 buckets). The post's examples use 8, 16, 64 which are already powers of two, so this is not an issue, but worth noting for readers.
- Another related setting, `grace_hash_join_max_buckets`, limits how far ClickHouse can grow buckets during dynamic expansion. The post does not mention it; could be a useful follow-up.
- The system.query_log columns referenced (`query_id`, `written_bytes`, `read_bytes`, `memory_usage`, `type`, `event_time`, `query`) are all valid columns in ClickHouse's system.query_log table.
- Partitioning "both tables" using the same hash function is accurate per the ClickHouse engineering blog.
- The "doubles the bucket count" phrasing is broadly consistent with the documented dynamic bucket expansion (buckets are powers of two), though official docs describe it as "dynamically increases" rather than guaranteeing strict doubling. Kept as written since it is a reasonable simplification.
