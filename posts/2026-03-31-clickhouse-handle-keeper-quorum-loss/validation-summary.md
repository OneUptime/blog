# Validation Summary: How to Handle a ClickHouse Keeper Quorum Loss

## Status
validated

## Post Type
Tutorial / Incident Response Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper (Raft consensus, NuRaft)
- ZooKeeper-compatible four-letter-word (4LW) admin protocol
- ReplicatedMergeTree
- `system.replicas` / `system.zookeeper` system tables
- systemd (`systemctl`)
- `nc` (netcat) for 4LW command delivery

## Sources Consulted
- ClickHouse Keeper official docs: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ClickHouse Keeper operations docs: https://clickhouse.com/docs/en/operations/clickhouse-keeper
- `clickhouse-keeper-client` utility docs: https://clickhouse.com/docs/en/operations/utilities/clickhouse-keeper-client
- `system.replicas` reference: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ZooKeeper 4LW admin command reference (for compatible command semantics)

## Issues Found
1. **Incorrect use of `clickhouse-keeper-client -q "stat"` / `-q "ruok"`.** The post used the ZooKeeper-style four-letter-word (4LW) admin commands `stat` and `ruok` through `clickhouse-keeper-client -q`, but that client only supports znode-path operations (`ls`, `get`, `create`, `rm`, `flwc`, etc.) via `-q`. 4LW commands must be sent to the client port using `nc`/telnet, e.g. `echo stat | nc <host> 9181`. Fixed by replacing all such invocations with `echo <cmd> | nc <host> 9181`.
2. **Inaccurate `Mode: read-only` claim.** The `stat`/`srvr` 4LW output reports `Mode: leader|follower|observer`; there is no `Mode: read-only`. Read-only state is reported by the `isro` 4LW command (returns `ro` or `rw`). Fixed the section to describe the correct detection path (`isro`) and to reflect that nodes typically fail to respond when quorum is unreachable.
3. **Minor clarity fix in monitoring guidance.** The "alert when fewer than 2 Keeper nodes respond" line assumed a 3-node cluster; generalised to "fewer than a majority" so it holds for 3 *or* 5-node ensembles as recommended just above it.

## Review Notes
- The default client port `9181` is correct and documented.
- `is_session_expired` is a valid `system.replicas` column.
- `/var/lib/clickhouse/coordination/snapshots/` is the standard packaged path used in official example configs; it is configurable via `<snapshot_storage_path>`. The post's use is fine as the conventional default.
- The snapshot-copy recovery procedure is a legitimate last-resort approach; in production the ClickHouse-documented `rcvr` 4LW and single-node `recovery` mode can also be used to bring up a lone surviving node, but the post's approach is valid and simpler to explain.
- `system.zookeeper` legitimately queries Keeper from within a ClickHouse client.
- The Raft consensus characterisation, odd-node-count recommendation, and AZ-spread guidance are all accurate.
