# Validation Summary: How to Debug ClickHouse INSERT Performance Problems

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- ClickHouse (MergeTree engine, system tables)
- ClickHouse async inserts
- ClickHouse server/profile XML configuration
- Python (clickhouse-driver style client)

## Sources Consulted
- ClickHouse system.merges documentation: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse system.parts documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse settings documentation (async_insert, async_insert_max_data_size, async_insert_busy_timeout_ms): https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse async insert guide: https://clickhouse.com/docs/en/optimize/asynchronous-inserts
- ClickHouse server settings (background_pool_size): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings

## Issues Found
- **`system.merges` query referenced a non-existent `num_tries` column.** The original query used `count() AS queue_size` and `sum(num_tries) AS total_tries` against `system.merges`, but `num_tries` is not a column on that table — it lives on `system.replication_queue`. Replaced with valid `system.merges` columns (`elapsed`, `progress`) and renamed `queue_size` to `active_merges` since `system.merges` represents currently executing merges, not a queue. The fix preserves the section's intent (assess whether background merges can keep up).

## Review Notes
- `async_insert_busy_timeout_ms` is still valid but is now an alias for the preferred `async_insert_busy_timeout_max_ms` in newer ClickHouse versions. The original name continues to work, so no change needed.
- `background_pool_size` is a server-level setting (config.xml), not a user/profile setting — the post shows it as a standalone XML snippet without explicitly placing it in users.xml, so this is acceptable as written.
- The "300 active parts per table" warning threshold is a reasonable rule of thumb; ClickHouse itself begins throttling inserts at 150 parts (`parts_to_delay_insert`) and rejects at 300 (`parts_to_throw_insert`) by default — the guidance is consistent with these defaults.
- The Python snippet matches the `clickhouse-driver` API; users on `clickhouse-connect` would use `client.insert(...)` instead, but this is a stylistic note rather than an error.
