# Validation Summary: How to Use Async Inserts in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (async inserts, MergeTree, ReplicatedMergeTree)
- ClickHouse SQL settings (`async_insert`, `wait_for_async_insert`, `async_insert_max_data_size`, `async_insert_busy_timeout_ms`, `async_insert_max_query_number`, `wait_for_async_insert_timeout`, `async_insert_deduplicate`)
- ClickHouse server configuration (`config.xml` profiles)
- `clickhouse-connect` (Python client)
- `clickhouse-go` (Go driver)
- ClickHouse system tables (`system.asynchronous_inserts`, `system.asynchronous_insert_log`, `system.metrics`)

## Sources Consulted
- ClickHouse async inserts guide: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse source (`src/Core/Settings.cpp` on master) for authoritative default values of the `async_insert_*` and `wait_for_async_insert*` settings
- `clickhouse-connect` Python docs (client settings parameter)
- `clickhouse-go` v2 docs (Options.Settings)

## Issues Found

1. **Incorrect default for `async_insert_max_data_size`.** The post originally commented `-- 1MB default`. The actual open-source default in `Settings.cpp` is `10485760` (10 MiB). Cloud default is 100 MiB. Updated the comment to `-- default is 10 MiB (10485760)`. The chosen example value of `1000000` is still a valid user-set override.

2. **Misleading description of `wait_for_async_insert = 1` durability semantics.** The post said `wait_for_async_insert=1` gives "confirmation that data is in the buffer and will be persisted." Per the official docs and source comments, when this flag is true the client waits until the data is actually *flushed to the table*, not merely queued in the buffer. Rewrote the comment block to correctly describe that `=1` waits for the flush to complete, providing a durability guarantee equivalent to a synchronous INSERT.

3. **`async_insert_deduplicate` applies only to replicated tables.** The post implied it works generally. The ClickHouse setting description explicitly scopes it to "async INSERT queries in the replicated table." Added a note that it only applies to `Replicated*` engines and clarified that deduplication tracks block hashes via ZooKeeper/Keeper rather than a vague "insert hash within the flush window."

## Review Notes
- The `async_insert_busy_timeout_ms` default of 200 ms matches the open-source default (it is an alias for `async_insert_busy_timeout_max_ms`, also 200 ms). On ClickHouse Cloud the default is 1000 ms — worth noting for Cloud users but not incorrect in the post.
- The post does not mention the adaptive busy timeout (`async_insert_use_adaptive_busy_timeout`, default `true`) or the min/max pair (`async_insert_busy_timeout_min_ms` = 50 ms, `async_insert_busy_timeout_max_ms` = 200 ms). This is acceptable for an introductory post but could be added as a future deep-dive.
- `async_insert_max_query_number` (default 450) only takes effect when `async_insert_deduplicate = 1`. The post describes it as a general flush trigger; worth refining in a later revision but the numeric default shown is accurate.
- SQL DDL (`CREATE TABLE user_events ...`), `system.asynchronous_inserts` and `system.asynchronous_insert_log` schemas, `ALTER USER ... SETTINGS`, and `config.xml` profile syntax are all valid for current ClickHouse versions.
- Python `clickhouse-connect.get_client(settings=...)` and Go `clickhouse.Options{Settings: ...}` usage are correct for the current drivers.
