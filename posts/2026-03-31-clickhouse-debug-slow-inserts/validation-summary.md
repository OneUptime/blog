# Validation Summary: How to Debug Slow Inserts in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse system tables (system.query_log, system.parts, system.merges)
- ClickHouse async insert subsystem
- `iostat` (Linux sysstat)

## Sources Consulted
- ClickHouse system tables reference: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.parts: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.merges: https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse MergeTree settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse query/session settings: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse async inserts: https://clickhouse.com/docs/optimize/asynchronous-inserts

## Issues Found

1. **`ALTER TABLE ... MODIFY SETTING` included non-MergeTree settings.** The original "Tuning Storage Settings" block combined `min_insert_block_size_rows` and `min_insert_block_size_bytes` with `parts_to_delay_insert` and `parts_to_throw_insert` inside a single `ALTER TABLE events MODIFY SETTING` statement. The first two are session/query-level settings and cannot be set as MergeTree table settings — the statement would fail at runtime. Fix: split into a `SET` block for the session-level settings and an `ALTER TABLE ... MODIFY SETTING` block for only the MergeTree-specific `parts_to_delay_insert` and `parts_to_throw_insert`.

## Review Notes

- `async_insert_busy_timeout_ms` still works as an alias, but in ClickHouse 24.2+ the async insert timeout is controlled by `async_insert_busy_timeout_min_ms` and `async_insert_busy_timeout_max_ms` (with `async_insert_use_adaptive_busy_timeout` for adaptive behavior). The example in Step 6 remains valid but readers on newer versions may want the adaptive settings.
- `async_insert_max_data_size` default has evolved across versions (currently 10 MiB in many builds, 100 MiB in ClickHouse Cloud). The example's explicit 10 MiB value is fine.
- The recommended `parts_to_delay_insert = 300` / `parts_to_throw_insert = 600` values are more aggressive (lower) than current ClickHouse defaults (1000 / 3000). These are still valid tuning choices for workloads that want to fail fast on part accumulation, but readers should be aware they are tightening, not loosening, the thresholds.
- The "too many parts" wording in Step 4 is slightly imprecise: `parts_to_delay_insert` causes inserts to be throttled (delayed), while `parts_to_throw_insert` causes them to be rejected with the "Too many parts" exception. Not a correctness error, just nuance.
- The post description mentions "write-ahead log settings" but the body does not cover WAL (the old MergeTree WAL feature was deprecated and removed). Minor wording mismatch, not a technical error.
