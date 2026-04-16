# Validation Summary: How to Configure ClickHouse Keeper for Three-Node Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Keeper
- Raft consensus protocol
- ZooKeeper-compatible four-letter-word (4lw) commands
- systemd (clickhouse-keeper service)
- ufw (firewall)

## Sources Consulted
- [ClickHouse Keeper official docs](https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper)
- [ClickHouse Keeper operations docs](https://clickhouse.com/docs/en/operations/clickhouse-keeper)
- [Altinity KB: clickhouse-keeper](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-zookeeper/clickhouse-keeper/)
- ClickHouse source (programs/keeper-client/KeeperClient.h) referenced via GitHub search results

## Issues Found
- **Incorrect invocation of four-letter-word commands.** The post used `clickhouse-keeper-client -h <host> -p 9181 -q "ruok"` (and similarly for `mntr` and `stat`). The `-q` flag of `clickhouse-keeper-client` executes ZooKeeper-protocol queries (like `get`, `ls`, `set`) — not four-letter-word commands. Per the official ClickHouse Keeper docs, 4lw commands must be sent via `telnet` or `nc` on the client port (e.g., `echo mntr | nc localhost 9181`). Fixed all four occurrences in the "Starting the Cluster", "Verify Cluster Health", and "Testing Fault Tolerance" sections to use `echo <cmd> | nc <host> 9181`.

## Review Notes
- The XML config (`raft_configuration`, `<server>` entries with `id`/`hostname`/`port`, `tcp_port` 9181, raft port 9234) is correct.
- `coordination_settings` fields used (`operation_timeout_ms`, `session_timeout_ms`, `raft_logs_level=warning`, `rotate_log_storage_interval=100000`) are all valid per the Keeper docs.
- The Raft quorum claim (2 of 3 nodes tolerates 1 failure) is correct.
- Four-letter-word commands require the `four_letter_word_white_list` setting; all commands used (`ruok`, `mntr`, `stat`) are in the default whitelist, so no config change is required — worth mentioning in a future revision for completeness.
- Alternative path for 4lw from `clickhouse-keeper-client`: `clickhouse-keeper-client -h <host> -p 9181 -q "flwc ruok"` also works, but the `nc`-based form in the official docs was chosen as the more portable recommendation.
- `zk_num_alive_connections` counts all connected clients, not only ClickHouse servers — the description in the post is loose but not incorrect in typical deployments.
