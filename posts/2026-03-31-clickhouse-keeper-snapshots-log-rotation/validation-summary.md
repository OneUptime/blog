# Validation Summary: How to Configure ClickHouse Keeper Snapshots and Log Rotation

## Status
validated

## Post Type
Guide / Tutorial (operational how-to)

## Technologies Covered
- ClickHouse Keeper (Raft-based coordination service)
- XML configuration (`keeper_config.xml`, `coordination_settings`, `logger`)
- Four-letter-word (4LW) protocol commands
- `clickhouse-keeper-client` utility
- `logrotate`
- Prometheus (alerting rules, `node_exporter` filesystem metrics)
- Bash scripting / `nc` / `du` / `ls` / `watch`

## Sources Consulted
- ClickHouse Keeper official docs: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- `clickhouse-keeper-client` utility docs: https://clickhouse.com/docs/operations/utilities/clickhouse-keeper-client
- ClickHouse PR #41766 (manual snapshot creation for Keeper): https://github.com/ClickHouse/ClickHouse/pull/41766
- ClickHouse source / tests: `tests/config/config.d/keeper_port.xml`
- Altinity KB — clickhouse-keeper: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-zookeeper/clickhouse-keeper/

## Issues Found
1. **Incorrect default for `snapshot_distance`.** The post stated "The default of 1,000,000 entries is a good starting point." The official default is `100000`. Rewrote the sentence to state the correct default and note that 1,000,000 is a common starting point for busy clusters, preserving the author's intent.
2. **Incorrect comment on `rotate_log_storage_interval`.** The inline XML comment said "Rotate log storage every N snapshots". Per the docs, the setting controls "how many log records to store in a single file" — it is measured in log records, not snapshots. Updated the comment accordingly.
3. **Non-existent `snap` four-letter-word command.** The post recommended `echo "snap" | nc ...`. There is no `snap` 4LW command in ClickHouse Keeper; the correct command is `csnp` (schedule a snapshot creation task, returns last committed log index). Replaced with `csnp`.
4. **Non-existent `snapshot` command in `clickhouse-keeper-client`.** The post showed an interactive `> snapshot` command that does not exist in the keeper client's command set. Replaced with the correct approach: `flwc csnp`, which dispatches the 4LW command through the client.

## Review Notes
- `compress_logs` default in the upstream docs is `false`; the post (correctly) enables it. Worth noting as a caveat but not an error — the post is prescriptive, not documenting defaults.
- The `csnp` command schedules the snapshot asynchronously and returns an index. Operators can use `lgif` to confirm the snapshot has completed — not covered in the post but a reasonable follow-up.
- The `stat` 4LW output shown is representative of ZooKeeper-style output. ClickHouse Keeper's `stat` output is compatible with this format, so the sample is acceptable.
- The `logrotate` `copytruncate` note is reasonable; Keeper does not ship with a documented `SIGHUP`-based log reopen, and `copytruncate` is the standard approach for processes without log-reopen signals.
- File naming conventions shown (`snapshot_N.bin.zstd`, `changelog_A_B.bin.zstd`) match observed behavior when `compress_snapshots_with_zstd_format` / `compress_logs` are enabled.
