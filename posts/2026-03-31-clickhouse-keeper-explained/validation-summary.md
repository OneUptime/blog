# Validation Summary: What Is ClickHouse Keeper and Why You Need It

## Status
validated

## Post Type
Guide / Reference (introduction + deployment + monitoring guide)

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- Apache ZooKeeper
- Raft consensus protocol
- ZAB protocol
- ReplicatedMergeTree
- XML configuration

## Sources Consulted
- ClickHouse Keeper official guide: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- system.zookeeper_connection docs: https://clickhouse.com/docs/en/operations/system-tables/zookeeper_connection
- system.metrics docs: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse 4-letter-word commands documentation

## Issues Found
No technical issues found.

Verified items:
- `<keeper_server>` config block structure including `tcp_port`, `server_id`, `log_storage_path`, `snapshot_storage_path`, `coordination_settings` (`operation_timeout_ms`, `session_timeout_ms`, `raft_logs_level`), and `raft_configuration` with `<server>`/`<id>`/`<hostname>`/`<port>` matches official docs.
- Conventional client port 9181 and inter-server raft port 9234 are correct (the docs use these in examples).
- `clickhouse-keeper-converter` CLI exists with `--zookeeper-logs-dir`, `--zookeeper-snapshots-dir`, and `--output-dir` flags.
- `system.zookeeper_connection` is a real table introduced in ClickHouse for monitoring keeper connectivity.
- 4lw commands `ruok` (returns `imok`), `stat`, and `mntr` are all on the default whitelist.
- `system.metrics` entries `ZooKeeperRequest`, `ZooKeeperWatch`, and `ZooKeeperSession` all exist with the descriptions implied by the post.
- Raft quorum / fault-tolerance table is mathematically correct.
- The behavior list when Keeper is unavailable (reads ok, writes/merges/DDL/new replica init blocked) matches ReplicatedMergeTree behavior.

## Review Notes
- The default `session_timeout_ms` upstream is 100000 ms, while the post uses 30000 ms in its example. Both are valid configuration values; the post's value is just an operator choice and not incorrect.
- The migration section calls the cutover "zero-downtime if done carefully." In practice the standard `clickhouse-keeper-converter` flow requires briefly stopping the ZooKeeper ensemble to take a consistent snapshot — the qualifier "if done carefully" leaves room for this, so no change was made, but readers should not assume zero-touch.
- The XML examples omit `<distributed_ddl>` and `<remote_servers>` config that a fully working cluster would also need; this is appropriate scope for an introductory post on Keeper specifically.
