# Validation Summary: How to Configure ClickHouse Keeper Snapshots and Logs

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse Keeper (built-in ZooKeeper replacement)
- ClickHouse coordination_settings
- Raft configuration
- ClickHouse system tables (`system.zookeeper`, `system.replicas`, `system.zookeeper_connection`)
- Keeper 4-letter word (4lw) commands
- systemd / `clickhouse-server` service

## Sources Consulted
- [ClickHouse Keeper Guide](https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper) — coordination_settings reference and 4lw commands list
- [ClickHouse system.zookeeper docs](https://clickhouse.com/docs/en/operations/system-tables/zookeeper)
- [ClickHouse KeeperMap engine docs](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/engines/table-engines/special/keepermap.md)

## Issues Found

1. **Invalid setting `<leader_heartbeat_ms>`** — ClickHouse Keeper does not have this setting. The correct setting name is `<heart_beat_interval_ms>` (default: 500). Replaced.

2. **Mislabeled `<min_session_timeout_ms>` setting** — The post described `min_session_timeout_ms` as "Minimum number of snapshots to retain", which is incorrect. `min_session_timeout_ms` is a session timeout in milliseconds, not a snapshot retention setting. Removed the misleading entry; `snapshots_to_keep` already (correctly) describes max snapshots retained.

3. **Invalid setting `<max_log_file_size>`** — This is not a real `coordination_settings` option in ClickHouse Keeper. The correct setting for controlling log file rotation is `<rotate_log_storage_interval>` (default: 100000). Replaced and corrected the comment.

4. **Invalid 4lw command `snapshot`** — `echo "snapshot" | nc localhost 9181` is not a valid ClickHouse Keeper 4-letter word command. The correct command to schedule a snapshot creation is `csnp`. Replaced.

5. **Non-existent `system.keeper_map_table_names` table** — There is no such system table in ClickHouse. Replaced with `system.zookeeper_connection`, which is a real system table that exposes Keeper connection details.

## Review Notes
- The XML configuration structure (`<keeper_server>`, `<raft_configuration>`, `<coordination_settings>`) and core settings (`tcp_port`, `server_id`, `log_storage_path`, `snapshot_storage_path`, `snapshot_distance`, `snapshots_to_keep`, `reserved_log_items`, `operation_timeout_ms`, `session_timeout_ms`, `dead_session_check_period_ms`, `raft_logs_level`) are accurate.
- The `system.replicas` query for monitoring lag (`log_max_index - log_pointer`) is correct.
- 4lw commands `stat`, `mntr`, `ruok` are valid; in some installations they must be enabled via the `<four_letter_word_white_list>` setting (default allows these).
- `systemctl restart clickhouse-server` restarts the embedded Keeper if running in the same process; standalone Keeper deployments use `clickhouse-keeper` service instead — readers running a dedicated Keeper cluster should adjust accordingly.
