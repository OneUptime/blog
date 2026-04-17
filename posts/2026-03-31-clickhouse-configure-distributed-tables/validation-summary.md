# Validation Summary: How to Configure Distributed Tables in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Distributed table engine
- ReplicatedMergeTree table engine
- ClickHouse cluster configuration (XML)
- SQL DDL/DML

## Sources Consulted
- ClickHouse Distributed table engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse system.distribution_queue docs: https://clickhouse.com/docs/en/operations/system-tables/distribution_queue
- ClickHouse ReplicatedMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication

## Issues Found
1. **Deprecated setting `insert_distributed_sync`** — This setting was renamed to `distributed_foreground_insert` in ClickHouse 23.10. Updated both the `SET` example and the Summary section to use the current name.
2. **Deprecated XML settings `distributed_directory_monitor_sleep_time_ms` / `distributed_directory_monitor_max_sleep_time_ms`** — Renamed to `distributed_background_insert_sleep_time_ms` / `distributed_background_insert_max_sleep_time_ms` in ClickHouse 23.10. Updated the XML snippet to use the current names.

## Review Notes
- The `Distributed(cluster, database, table, sharding_key)` engine signature, `intHash64(user_id)` sharding key, `ON CLUSTER` syntax, `ReplicatedMergeTree` macros (`{shard}`, `{replica}`), and `system.distribution_queue` (with `data_files` column) were all verified as correct against current ClickHouse documentation.
- The old setting names still work as aliases in current ClickHouse versions for backward compatibility, but the renamed forms are the preferred and documented names going forward.
- The post does not specify a ClickHouse version; readers on versions older than 23.10 may need to fall back to the legacy setting names.
