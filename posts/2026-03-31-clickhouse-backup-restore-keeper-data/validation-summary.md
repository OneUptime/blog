# Validation Summary: How to Back Up and Restore ClickHouse Keeper Data

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse Keeper (ZooKeeper-compatible coordination service)
- Raft consensus (snapshots and logs)
- Linux systemd (`systemctl`)
- `rsync`, `nc` (netcat) for operational tasks
- XML-based ClickHouse Keeper configuration (`keeper_config.xml`)

## Sources Consulted
- ClickHouse Keeper official documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse Keeper four-letter word commands reference (same page)
- ClickHouse coordination settings reference (same page)

## Issues Found
1. **Wrong four-letter command for triggering a snapshot.** The post originally used `echo snapshot | nc localhost 9181`. The ClickHouse Keeper four-letter word for scheduling a snapshot is `csnp` (which, fittingly, is actually four letters — unlike `snapshot`). Changed the command to `echo csnp | nc localhost 9181`.
2. **Incorrect setting name for snapshot retention.** The post used `<max_stored_snapshots>` inside `<coordination_settings>`. The correct ClickHouse Keeper setting name is `snapshots_to_keep` (default: 3). Renamed the XML element to `<snapshots_to_keep>`.

## Review Notes
- Port `9181` is the default Keeper client/four-letter-word TCP port, correct as used.
- The four-letter-word allowlist is controlled by `four_letter_word_white_list` in `keeper_config.xml`; by default `csnp` and `ruok` are enabled, but operators who've restricted the allowlist may need to add them before the examples work. Not incorrect as written, just worth knowing.
- For multi-node Keeper clusters, naively rsync-ing coordination data between members can desync Raft state. The post's restore procedure is reasonable for a single-node Keeper or a full-cluster rebuild where all nodes are restored from the same backup; partial-cluster restores are out of scope here and not claimed.
- `snapshot_distance` default is `100000`; the example value matches the default. Explanation of the tradeoff (lower = more frequent snapshots, less log replay, slightly higher I/O) is accurate.
- `ruok` returning `imok` for a healthy node is correct.
- Paths under `/var/lib/clickhouse-keeper/coordination/{snapshots,log}` match the documented defaults.
