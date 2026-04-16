# Validation Summary: How to Recover ClickHouse Keeper from Quorum Loss

## Status
validated

## Post Type
Tutorial / Guide (disaster recovery runbook)

## Technologies Covered
- ClickHouse Keeper
- Raft consensus algorithm
- ClickHouse system tables (`system.zookeeper_connection`, `system.replicas`, `system.replication_queue`)
- Four-letter-word (4lw) commands (`ruok`, `stat`, `mntr`, `rcvr`)
- systemd service management

## Sources Consulted
- [ClickHouse Keeper guide (SRE)](https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper) — recovery-after-losing-quorum section, 4lw commands, `--force-recovery` flag
- [system.zookeeper_connection](https://clickhouse.com/docs/en/operations/system-tables/zookeeper_connection) — column list
- ClickHouse Keeper configuration reference (`keeper_server`, `raft_configuration`, `server_id`, default `tcp_port` 2181)

## Issues Found

1. **Invalid `<force_recover>` XML setting.** The original Step 3 instructed readers to add `<force_recover>true</force_recover>` to the `<keeper_server>` block. No such XML setting exists in ClickHouse Keeper. Recovery mode is activated either by (a) starting the binary with the `--force-recovery` command-line flag or (b) sending the `rcvr` four-letter-word command to a running node. Step 3 was rewritten to use the correct activation mechanisms, and the verification step was updated to use the `mntr` 4lw command (which actually reports `zk_server_state leader`) rather than reading a non-existent "Mode: leader" line from `stat`.
2. **Step 4 contradiction.** Step 4 told readers to remove `<force_recover>true</force_recover>` from the config, which never existed. Rewrote it to describe the two correct post-recovery paths: restart without `--force-recovery` if that flag was used, or do nothing if the `rcvr` 4lw command was used (the node exits recovery mode automatically when quorum is achieved).
3. **Non-existent column in SQL comment.** The comment under the `SELECT * FROM system.zookeeper_connection` query referenced a `connected_status` column, which does not exist in that system table. Replaced with guidance based on the real `is_expired` column.
4. **Summary paragraph.** Updated the closing summary to reflect the corrected recovery procedure (flag/4lw command) and to drop the phantom "remove `force_recover` from configuration" step.

## Review Notes
- The default client port for ClickHouse Keeper is indeed `2181` (the legacy ZooKeeper port). ClickHouse's own documentation examples frequently use `9181`; either works. The post sticks with 2181, which matches the documented default.
- The raft inter-server port `9234` used throughout is a community convention (matches official examples) but is not a default — it must be explicitly configured. No change required since the post shows it in the XML.
- The snapshot path `/var/lib/clickhouse-keeper/snapshots/` matches the layout of the standalone `clickhouse-keeper` Debian/RPM package. Integrated Keeper (inside `clickhouse-server`) uses `/var/lib/clickhouse/coordination/snapshots/`. Left as-is because the post is explicitly about the standalone service (`systemctl ... clickhouse-keeper`).
- `system.replicas` columns (`database`, `table`, `active_replicas`, `total_replicas`, `queue_size`) and `system.replication_queue.is_currently_executing` all exist and are used correctly.
- The Mermaid diagram is conceptually accurate.
