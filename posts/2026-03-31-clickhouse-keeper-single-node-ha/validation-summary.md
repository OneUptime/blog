# Validation Summary: How to Use ClickHouse Keeper for Single-Node HA

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper (embedded mode)
- ReplicatedMergeTree table engine
- Raft consensus protocol
- systemd / journalctl
- ZooKeeper 4LW commands (`ruok`, `stat`)

## Sources Consulted
- ClickHouse Keeper official documentation: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ClickHouse Keeper configuration reference: https://clickhouse.com/docs/en/operations/clickhouse-keeper
- ReplicatedMergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- system.zookeeper / system.zookeeper_connection / system.replicas: https://clickhouse.com/docs/en/operations/system-tables
- clickhouse-keeper-converter docs: https://clickhouse.com/docs/en/operations/clickhouse-keeper#migration-from-zookeeper

## Issues Found
- **Incorrect use of `clickhouse-keeper-converter` for migration**: In the "Expanding to a Multi-Node Cluster Later" section, step 2 originally suggested using `clickhouse-keeper-converter` to migrate Keeper data from the embedded single-node setup to a new external cluster. That tool is specifically designed for converting **ZooKeeper** snapshot/log data into the ClickHouse Keeper format — it is not used for Keeper-to-Keeper migration. Updated the step to recommend copying the snapshot and log files directly from the embedded Keeper into the new cluster's leader (with the existing "or start fresh" alternative preserved).

## Review Notes
- The `<keeper_server>` configuration uses correct, current setting names: `tcp_port`, `server_id`, `log_storage_path`, `snapshot_storage_path`, and the `coordination_settings` children (`operation_timeout_ms`, `min_session_timeout_ms`, `session_timeout_ms`, `dead_session_check_period_ms`, `heart_beat_interval_ms`, `election_timeout_lower_bound_ms`, `election_timeout_upper_bound_ms`, `reserved_log_items`, `snapshot_distance`, `auto_forwarding`, `shutdown_timeout`, `startup_timeout`, `raft_logs_level`, `compress_logs`, `compress_snapshots_with_zstd_format`) all match the official Keeper coordination settings.
- The default Raft inter-server port `9444` and Keeper client port `9181` are correct.
- The `ruok` / `imok` and `stat` 4LW commands are supported by ClickHouse Keeper (with the default `four_letter_word_white_list` allowing them).
- `system.zookeeper_connection`, `system.zookeeper`, and `system.replicas` are valid system tables with the columns referenced in the queries.
- The macros (`{shard}`, `{replica}`) and the `ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')` DDL syntax is correct.
- Note: `system.zookeeper_connection` was added in newer ClickHouse versions (~22.x); on very old releases users may need to fall back to `system.zookeeper_log` instead. Not flagged inline since the post does not target a specific old version.
