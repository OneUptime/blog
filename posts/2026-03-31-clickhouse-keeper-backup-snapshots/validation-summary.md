# Validation Summary: How to Back Up ClickHouse Keeper Snapshots

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- ClickHouse Keeper (snapshot and Raft log persistence)
- ClickHouse Keeper four-letter word (4lw) commands
- `clickhouse-keeper-client`
- ClickHouse `ReplicatedMergeTree` engine
- Bash scripting (`cp`, `rsync`, `find`, cron)
- systemd (`systemctl`)

## Sources Consulted
- ClickHouse Keeper documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper (four-letter word commands, default whitelist, `csnp` / `lgif` semantics)
- ClickHouse `clickhouse-keeper-client` documentation: https://clickhouse.com/docs/operations/utilities/clickhouse-keeper-client (command list — `ls`, `cd`, `create`, `get`, `set`, `rm`, `touch`, `cp`, `cpr`, `mv`, `mvr`, `rmr`, `exists`, `watch`, `get_stat`, `find_super_nodes`, `find_big_family`, `get_direct_children_number`, `reconfig`, `sync`, `delete_stale_backups`, `flwc`)
- ClickHouse PR #41766 "Manually snapshot creation for keeper" — introduced the `csnp` 4lw command
- ClickHouse `ReplicatedMergeTree` and `ALTER TABLE ... ATTACH PARTITION ALL` documentation

## Issues Found

1. **Method 2 used the wrong four-letter word command.** The post had `echo "snap" | nc keeper1.internal 2181` to trigger a snapshot. `snap` is a legacy ZooKeeper admin 4lw and is not implemented in ClickHouse Keeper. The correct 4lw for scheduling a snapshot in ClickHouse Keeper is `csnp`, which is included in the default `four_letter_word_white_list`. Changed the command to `echo "csnp" | nc keeper1.internal 2181` and updated the accompanying comment.

2. **Method 4 referenced a non-existent `snapshot` command in `clickhouse-keeper-client`.** The keeper-client has no `snapshot` command (verified against the official command list). The correct way to trigger a snapshot from the client is through the `flwc` command, which forwards four-letter word commands to the server. Changed the example to use `flwc csnp` and corrected the expected output description (the command returns the last committed log index of the scheduled snapshot, not a "Snapshot created successfully" message).

## Review Notes
- The snapshot file naming pattern `snapshot_<last_committed_log_idx>.bin.zstd` (with `.bin` for uncompressed) and the `/var/lib/clickhouse-keeper/snapshots/` and `/var/lib/clickhouse-keeper/log/` paths match the ClickHouse Keeper defaults.
- The `snapshot_distance` configuration key and its meaning (snapshot taken every N committed log entries, default 100000) is accurate.
- The XML `<keeper_server>` config used in the verification script (`tcp_port`, `server_id`, `log_storage_path`, `snapshot_storage_path`, `coordination_settings/raft_logs_level`, `raft_configuration`) is valid for recent ClickHouse versions.
- The 4lw whitelist must include the commands used (`ruok`, `stat`, `csnp`); all commands used in the post are in the default whitelist.
- `ALTER TABLE ... ATTACH PARTITION ALL` is valid syntax in modern ClickHouse and a reasonable way to re-attach data after re-creating a replicated table.
- The `DETACH TABLE` → `CREATE TABLE` → `ATTACH PARTITION ALL` flow described under "What Happens if Keeper Metadata is Lost" is a simplified illustration; in production, operators may also need to handle stale metadata files under the table's data directory and may prefer `SYSTEM RESTORE REPLICA` where applicable. The section is intentionally high-level and does not claim to be an exhaustive recovery runbook, so it was left as-is.
- The `cp -p` of a currently-being-written Raft log segment is technically safe because the Raft log is replayed up to the last valid entry during recovery, as the comment in the script notes. Worth flagging: if the file is actively growing during the `cp`, the copy will contain whatever bytes existed at the time of each read, which may include a partial tail record — this is exactly the scenario the Raft replay handles.
