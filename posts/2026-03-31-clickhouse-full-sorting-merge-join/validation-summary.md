# Validation Summary: How to Use Full Sorting Merge Join in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- MergeTree table engine
- ClickHouse join algorithms (hash, parallel_hash, grace_hash, full_sorting_merge, partial_merge, auto)
- `system.query_log` introspection table

## Sources Consulted
- ClickHouse official docs — Joining Tables guide: https://clickhouse.com/docs/guides/joining-tables
- ClickHouse official docs — Settings reference (`join_algorithm`): https://clickhouse.com/docs/en/operations/settings/settings#join_algorithm
- ClickHouse official docs — GROUP BY clause: https://clickhouse.com/docs/en/sql-reference/statements/select/group-by

## Issues Found
1. **Invalid SQL in the first "Enabling Full Sorting Merge Join" example.** The query selected `e.user_id, u.country, count() AS events` without a `GROUP BY` clause. ClickHouse requires every non-aggregated selected column to appear in a `GROUP BY` key (or be wrapped in an aggregate function). Fixed by adding `GROUP BY e.user_id, u.country`.

2. **Incorrect fallback algorithm for `join_algorithm = 'auto'`.** The post stated that `auto` falls back to "grace hash join" if memory limits are hit. Per the official ClickHouse documentation, `auto` tries hash join first and falls back to **partial merge join** when the memory limit is violated, not grace hash join. Updated the text accordingly.

## Review Notes
- The description of Full Sorting Merge Join (sorts both sides by the join key, merges sorted streams, memory proportional to the largest group of equal keys) is accurate.
- The claim that pre-sorted MergeTree tables ordered by the join key allow the sorting phase to be skipped is correct; ClickHouse can exploit the existing physical order.
- The `system.query_log` columns referenced (`query`, `query_duration_ms`, `memory_usage`, `read_rows`, `type`, `event_time`) all exist and are correctly used.
- The list of join algorithms is correct; `partial_merge` and `direct` are also valid values not discussed in the post, but omitting them is a stylistic choice rather than an error.
- `join_algorithm` can accept multiple comma-separated values (e.g., `'hash,grace_hash'`) in newer versions — the post uses single-value form, which remains valid.
