# Validation Summary: How to Use insert_distributed_sync Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (Distributed table engine)
- ClickHouse session settings (`insert_distributed_sync`)
- ClickHouse system tables (`system.distribution_queue`, `system.query_log`)
- ClickHouse server XML configuration (user profiles, distributed background insert settings)

## Sources Consulted
- ClickHouse `system.distribution_queue` docs: https://clickhouse.com/docs/en/operations/system-tables/distribution_queue
- ClickHouse Session Settings docs: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse PR #55978 — "Rename directory monitor concept into background INSERT": https://github.com/ClickHouse/ClickHouse/pull/55978
- ClickHouse Distributed table engine docs: https://clickhouse.com/docs/engines/table-engines/special/distributed
- ClickHouse blog — Asynchronous Data Inserts: https://clickhouse.com/blog/asynchronous-data-inserts-in-clickhouse

## Issues Found
1. **Incorrect column names in `system.distribution_queue` query.** The post referenced `task_count`, `failed_count`, and `error`, none of which are real columns in `system.distribution_queue`. The actual columns are `data_files`, `error_count`, and `last_exception`. Fixed the SELECT, the ORDER BY, and the descriptive sentence below it to use the correct column names.
2. **Contradictory sentence in "Performance Comparison" section.** The original sentence read: "For high-throughput workloads, async inserts with batch monitoring provide better performance while async mode provides similar reliability with proper monitoring." Both clauses described async mode, which contradicted the post's own framing. Rewrote the second clause to describe sync mode's stronger delivery guarantees at the cost of latency, which matches the established async-vs-sync tradeoff.

## Review Notes
- The setting `insert_distributed_sync` was renamed to `distributed_foreground_insert` in ClickHouse PR #55978 (2023). The old name is preserved as an alias and continues to work, so the post remains technically correct, but readers on newer ClickHouse versions may also encounter the new name in documentation.
- Similarly, `distributed_directory_monitor_max_sleep_time_ms` and `distributed_directory_monitor_batch_inserts` were renamed to `distributed_background_insert_max_sleep_time_ms` and `distributed_background_insert_batch_inserts` respectively. Both old names still work as aliases. Left as-is to keep the post's terminology consistent with its title, but a future revision could note the new names.
- The `ALTER TABLE ... DROP PARTITION toYYYYMM(today())` example assumes the table is partitioned by `toYYYYMM(event_date)`. This is implied but not stated explicitly; readers copying the snippet to a different schema will need to adjust the partition expression.
