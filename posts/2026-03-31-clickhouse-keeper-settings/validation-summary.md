# Validation Summary: How to Configure ClickHouse Keeper Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- Apache ZooKeeper (protocol compatibility)
- Raft consensus algorithm
- XML configuration

## Sources Consulted
- ClickHouse Keeper guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- `system.zookeeper_connection` docs: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- `system.zookeeper` docs: https://clickhouse.com/docs/operations/system-tables/zookeeper
- ClickHouse server settings reference (coordination_settings)

## Issues Found
- **Incorrect system table name**: The post referenced `system.keeper_connection_stats`, which does not exist in ClickHouse. The correct table is `system.zookeeper_connection` (it reports the connection info for the ZooKeeper/Keeper client connection, including session timeout, host, port, last zxid, etc.). Fixed both the SQL example in the "Monitoring Keeper Health" section and the mention in the Summary.

## Review Notes
- The `<tcp_port>9181</tcp_port>` value matches every official Keeper example, though the documented low-level default is `2181`. Using `9181` is the conventional choice to avoid conflict with ZooKeeper.
- The `session_timeout_ms` value of `30000` in the example is a reasonable operator choice; the Keeper default is higher (`100000`). This is a configuration preference rather than an error.
- The four-letter words `ruok` and `mntr` are in the default `four_letter_word_white_list` and work as described.
- The Raft inter-server port `9234` and client port `9181` match the official documentation examples.
- All `coordination_settings` parameters used (`operation_timeout_ms`, `session_timeout_ms`, `raft_logs_level`, `rotate_log_storage_interval`, `reserved_log_items`, `snapshot_distance`) are valid Keeper settings.
