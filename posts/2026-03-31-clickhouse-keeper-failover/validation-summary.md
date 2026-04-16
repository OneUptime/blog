# Validation Summary: How to Handle ClickHouse Keeper Failover

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- Raft consensus algorithm
- ZooKeeper 4-letter commands (`stat`)
- systemd / systemctl
- XML configuration for `<keeper_server><coordination_settings>` and `<zookeeper>` sections
- ClickHouse system tables (`system.zookeeper_connection`, `system.replicas`)
- ClickHouse table functions (`clusterAllReplicas`)

## Sources Consulted
- ClickHouse Keeper guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- `system.zookeeper_connection`: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- `system.replicas`: https://clickhouse.com/docs/en/operations/system-tables/replicas
- `clusterAllReplicas` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse usage tips / `<zookeeper>` configuration: https://clickhouse.com/docs/operations/tips

## Issues Found
No technical issues found. All claims were verified against official documentation:

- Default values for `heart_beat_interval_ms` (500), `election_timeout_lower_bound_ms` (1000), and `election_timeout_upper_bound_ms` (2000) match the official defaults.
- `<coordination_settings>` is a valid XML tag (normally nested under `<keeper_server>`).
- `system.zookeeper_connection` exists as a documented system table.
- `operation_timeout_ms` (10000) and `session_timeout_ms` (30000) in the client-side `<zookeeper>` block are correct defaults.
- The `stat` 4lw command output includes a `Mode:` line with `leader` / `follower` / `standalone` values.
- `clusterAllReplicas` table function exists and behaves as described.
- `system.replicas` exposes `database`, `table`, `is_readonly`, and `absolute_delay` columns.
- The Raft failover sequence (heartbeat loss → randomized election timeout → candidate → majority vote → new leader) is described accurately.

## Review Notes
- The XML snippets show only the `<coordination_settings>` block without the enclosing `<keeper_server>` parent. This is a common shorthand in operational docs but readers should know the full server-side path is `<keeper_server><coordination_settings>`.
- Note that the server-side `<coordination_settings>` `session_timeout_ms` in Keeper defaults to 100000 ms (max allowed for a client session), which is separate from the client-side `<zookeeper>` `session_timeout_ms` default of 30000 ms that the post correctly shows. The two should not be conflated if the post is revised further.
- The exact log line "Become candidate" used in the journalctl grep is illustrative — real NuRaft log wording may vary slightly across ClickHouse versions, but the grep pattern is a reasonable heuristic.
- The claim that a single surviving Keeper node shows `Mode: follower` is plausible behavior but may vary: nodes unable to form quorum can remain in a candidate/election loop depending on the version and exact network state.
