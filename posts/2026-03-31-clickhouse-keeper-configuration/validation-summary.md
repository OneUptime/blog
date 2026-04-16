# Validation Summary: How to Configure ClickHouse Keeper (Native ZooKeeper Replacement)

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- ZooKeeper protocol (4-letter word commands)
- Raft consensus protocol
- systemd
- XML configuration

## Sources Consulted
- ClickHouse Keeper SRE guide: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ClickHouse Keeper operations docs: https://clickhouse.com/docs/operations/clickhouse-keeper
- `system.zookeeper` system table: https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- `system.zookeeper_connection` system table: https://clickhouse.com/docs/en/operations/system-tables/zookeeper_connection
- `system.zookeeper_log` system table reference

## Issues Found
1. **Raft inter-server port `9444` was wrong.** The official ClickHouse Keeper documentation example uses `9234` for the `<raft_configuration><server><port>` value. Replaced all four occurrences (three in the standalone `raft_configuration`, one in the embedded `raft_configuration`) with `9234`. Also corrected the port reference table at the bottom and the firewall sentence.
2. **Misleading comment on `operation_timeout_ms`.** The XML comment claimed it was the "Raft heartbeat interval in milliseconds." That setting controls the timeout for a single client operation; the Raft heartbeat is `heart_beat_interval_ms` (which is also present in the same block). Replaced the comment with an accurate description.
3. **Invalid 4lw command `lead`.** `lead` is not a valid ClickHouse Keeper four-letter word. The documented commands are `conf, cons, crst, envi, ruok, srst, srvr, stat, wchs, dirs, mntr, isro, rcvr, apiv, csnp, lgif, rqld, ydld`. Replaced `lead` with `mntr`, which exposes `zk_server_state: leader|follower|observer`.
4. **Invented system table `system.keeper_map_data_loss_candidate`.** This is not a real system table for checking leader/follower state. (`KeeperMap` is an unrelated table-engine feature.) Replaced the SQL example with a query against `system.zookeeper_log`, which is the correct table for inspecting recent Keeper requests/responses from this server's perspective.
5. **Port reference text** updated so the description of `9181` is accurate — it is ClickHouse Keeper's native default client port, not just an "alternative" port.

## Review Notes
- The post deliberately uses `tcp_port=2181` for the standalone Keeper to be drop-in compatible with existing ZooKeeper clients. This is consistent with the official SRE guide example. Be aware that ClickHouse Keeper's *native* default `tcp_port` is `9181`, so deployments that don't need ZK-port compatibility can keep `9181` instead.
- The standalone server flag `--config` is correct (the official docs show `clickhouse-keeper --config /etc/your_path_to_config/config.xml`). The post additionally uses `clickhouse keeper --config ... --daemon`, which is also accepted; left as-is.
- `compress_snapshots_with_zstd_format` and `compress_logs` are valid coordination settings (the former defaults to `true`); left as-is.
- The XML uses the modern `<clickhouse>` root element rather than the legacy `<yandex>` root, which is correct for current ClickHouse versions.
