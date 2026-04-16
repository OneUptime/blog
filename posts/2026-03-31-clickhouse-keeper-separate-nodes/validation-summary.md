# Validation Summary: How to Set Up ClickHouse Keeper on Separate Nodes

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- ClickHouse (server)
- ClickHouse Keeper (standalone coordination service, ZooKeeper-compatible)
- Raft consensus protocol
- systemd
- UFW firewall
- ZooKeeper four-letter-word (4LW) commands
- XML-based ClickHouse configuration

## Sources Consulted
- [ClickHouse Keeper Guide (SRE)](https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper)
- [ClickHouse Keeper Operations](https://clickhouse.com/docs/operations/clickhouse-keeper)
- [system.zookeeper_connection](https://clickhouse.com/docs/operations/system-tables/zookeeper_connection)
- [ClickHouse system tables index](https://clickhouse.com/docs/operations/system-tables)
- [Altinity KB: clickhouse-keeper](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-zookeeper/clickhouse-keeper/)
- [Altinity KB: clickhouse-keeper-service](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-zookeeper/clickhouse-keeper-service/)

## Issues Found

1. **Nonexistent system table `system.keeper_metrics`.** The post's "Monitoring Keeper from ClickHouse" section queried `system.keeper_metrics`, which is not a real ClickHouse system table. Keeper-related tables are `system.zookeeper`, `system.zookeeper_connection`, `system.zookeeper_connection_log`, `system.zookeeper_info`, and `system.zookeeper_log`; Keeper metrics are exposed via `system.metrics` (with a `Keeper%` prefix) and via the 4LW `mntr` command. The SQL query was replaced with a `system.metrics LIKE 'Keeper%'` query plus an `echo "mntr" | nc` example, and the listed metric names were updated to match what `mntr` actually returns (`zk_znode_count`, `zk_num_alive_connections`, `zk_avg_latency` / `zk_max_latency`, and `KeeperOutstandingRequests`).

2. **Nonexistent column `connected_status` in `system.zookeeper_connection`.** The post's verification snippet read `-- connected_status should be 'Connected'`. The real table has no such column; connection liveness is tracked via `is_expired` (UInt8, should be 0 when the session is alive), `connected_time`, and `session_uptime_elapsed_seconds`. Comment was corrected to reference `is_expired`.

3. **Wrong default config filename for the standalone Keeper package.** The post used `/etc/clickhouse-keeper/config.xml` in two XML snippet headers. The documented and package-installed default for standalone ClickHouse Keeper is `/etc/clickhouse-keeper/keeper_config.xml`. Both path comments were updated.

## Review Notes

- The XML configuration is otherwise valid: root `<clickhouse>` element, `<keeper_server>` block with `<tcp_port>`, `<server_id>`, `<log_storage_path>`, `<snapshot_storage_path>`, and a nested `<raft_configuration>` containing per-server `<id>`/`<hostname>`/`<port>` entries all match current docs.
- Default ports used (`2181` for the ZooKeeper-compatible client port, `9234` for Raft inter-server traffic) are correct; `2181` is the historical ZooKeeper default that ClickHouse Keeper can be configured to use, while `9181` is the ClickHouse-native default — the post's choice is valid as an explicit override.
- `coordination_settings` fields used (`operation_timeout_ms`, `session_timeout_ms`, `raft_logs_level`, `compress_logs`, `compress_snapshots_with_zstd_format`) are all valid per the Keeper configuration reference.
- 4LW commands `ruok`, `stat`, `mntr` are correctly listed and are ZooKeeper-compatible; the `stat`/Mode line output (`Mode: leader` / `Mode: follower`) is accurate.
- The installation snippet (`apt-get install clickhouse-keeper` / `yum install clickhouse-keeper`) assumes the ClickHouse apt/yum repository has already been configured; readers using a fresh host would also need `clickhouse-common-static` and to have added the ClickHouse repo first. This is a completeness caveat rather than an incorrect statement, so no change was made.
- The firewall section correctly scopes the client port (`2181`) to the ClickHouse tier CIDR and the Raft port (`9234`) to peer Keeper hosts. Note that `ufw allow from <hostname>` relies on name resolution at rule-add time; using explicit IPs or a dedicated Keeper-tier CIDR is more robust in practice but not incorrect as written.
- The 3-node fault-tolerance claim (tolerates 1 node down, quorum of 2) is correct for a standard Raft 3-node cluster.
