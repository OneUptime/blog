# Validation Summary: How to Recover a Failed ClickHouse Keeper Node

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse Keeper (coordination service based on Raft consensus)
- clickhouse-keeper-client CLI utility
- ClickHouse system tables (system.replicas, system.zookeeper_connection)
- systemd service management

## Sources Consulted
- ClickHouse Keeper documentation: https://clickhouse.com/docs/en/operations/clickhouse-keeper
- clickhouse-keeper-client documentation: https://clickhouse.com/docs/en/operations/utilities/clickhouse-keeper-client
- ClickHouse Keeper four-letter-word commands: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper#four-letter-word-commands
- system.zookeeper_connection table: https://clickhouse.com/docs/en/operations/system-tables/zookeeper_connection
- system.replicas table: https://clickhouse.com/docs/en/operations/system-tables/replicas

## Issues Found
1. **Incorrect `mntr` output field `zk_quorum_size`**: The post used `grep "zk_quorum_size"` against `mntr` output to verify quorum. The field `zk_quorum_size` does not exist in ClickHouse Keeper's `mntr` output. The correct fields to check on the leader node are `zk_followers` and `zk_synced_followers`. For a healthy 3-node cluster, the leader should report `zk_followers 2` and `zk_synced_followers 2`. Fixed the grep command and expected output accordingly.

## Review Notes
- The `coordination_settings` values shown (`rotate_log_storage_interval: 100000`, `snapshots_to_keep: 3`) match the documented defaults. While technically correct, the post could note these are already the defaults and that users would only need to set them if they want different values.
- The recovery procedure of clearing all coordination data and restarting is a widely practiced approach, though the official documentation does not explicitly guarantee that a node with completely empty state will seamlessly rejoin via automatic snapshot transfer. In practice, the NuRaft-based Raft implementation does support this, and it is the standard community recovery procedure.
- The default data path `/var/lib/clickhouse/coordination/` is the conventional path used in examples, though users with custom configurations may have different paths. The post could mention checking `keeper_server.storage_path` in the config.
