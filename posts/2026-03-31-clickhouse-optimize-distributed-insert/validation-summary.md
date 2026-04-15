# Validation Summary: How to Optimize Distributed INSERT INTO in ClickHouse

## Status
validated

## Post Type
Tutorial / Performance Guide

## Technologies Covered
- ClickHouse (Distributed engine, MergeTree, ReplicatedMergeTree)
- ClickHouse async inserts
- ClickHouse system tables (system.metrics)
- Distributed table sharding and ingestion

## Sources Consulted
- ClickHouse documentation on Distributed engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation on insert_distributed_sync setting: https://clickhouse.com/docs/en/operations/settings/settings#insert_distributed_sync
- ClickHouse documentation on async inserts: https://clickhouse.com/docs/en/optimize/asynchronous-inserts
- ClickHouse documentation on system.metrics table: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse documentation on the input() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/input

## Issues Found
- **Incorrect columns in system.metrics query**: The monitoring query selected `database`, `table`, `metric`, and `value` from `system.metrics`. The `system.metrics` table only has three columns: `metric` (String), `value` (Int64), and `description` (String). The `database` and `table` columns do not exist in this table. Fixed by replacing the selected columns with `metric`, `value`, and `description`.

## Review Notes
- The sharding expression example `cityHash64(user_id) % num_shards` is a conceptual illustration. In practice, users only specify the hash expression (e.g., `cityHash64(user_id)`) in the Distributed table DDL, and ClickHouse internally handles the modulo operation against the total shard weight. The "e.g." qualifier makes this acceptable but readers should know they don't literally write `% num_shards`.
- For per-table distributed queue monitoring (rather than the global metric), ClickHouse 21.3+ offers `system.distribution_queue` which does have `database`, `table`, `data_files`, and other columns. This could be a useful addition in a future update.
- All async insert settings (`async_insert`, `wait_for_async_insert`, `async_insert_max_data_size`, `async_insert_busy_timeout_ms`) are correct and current.
- The `input()` table function usage with FORMAT CSV is valid ClickHouse syntax.
- The recommendation to batch at least 100,000 rows per INSERT aligns with ClickHouse best practices.
