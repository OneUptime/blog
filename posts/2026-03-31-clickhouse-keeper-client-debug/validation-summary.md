# Validation Summary: How to Debug ClickHouse Keeper Issues with clickhouse-keeper-client

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse Keeper
- clickhouse-keeper-client CLI
- ZooKeeper four-letter-word (4lw) protocol
- ReplicatedMergeTree replication coordination
- DDL on-cluster task queue
- Linux networking utilities (`nc`, `ss`, `iptables`, `journalctl`)

## Sources Consulted
- [ClickHouse Docs — clickhouse-keeper-client utility](https://clickhouse.com/docs/operations/utilities/clickhouse-keeper-client)
- [ClickHouse Docs — ClickHouse Keeper guide / four-letter words](https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper)
- [ClickHouse source — `programs/keeper-client/KeeperClient.cpp`](https://github.com/ClickHouse/ClickHouse/blob/master/programs/keeper-client/KeeperClient.cpp)
- [ClickHouse Docs — SYSTEM DROP REPLICA](https://clickhouse.com/docs/sql-reference/statements/system)

## Issues Found

1. **Wrong timeout flag names and units.** The post used `--connection-timeout-ms` / `--session-timeout-ms` with millisecond values (`5000`, `30000`). The actual flags are `--connection-timeout` and `--session-timeout`, and they take **seconds** (default 10s). Updated the example to use `--connection-timeout 5` and `--session-timeout 30` and added a clarifying comment about the unit.

2. **Non-existent client commands listed.** The "Basic Navigation Commands" block listed `delete`, `deleteall`, and `stat`, none of which exist in `clickhouse-keeper-client`. The actual commands are `rm`, `rmr`, and `get_stat`. Replaced them and added a few real commands the post relied on or referred to (`cd`, `touch`, `flwc`).

3. **`stat [path]` used in the example output.** Same root cause as above — the `get` example showed znode stats inline, but in `clickhouse-keeper-client` `get` only returns the value. Split the demonstration into a `get` call (returns value) followed by a `get_stat` call (returns metadata).

4. **`deleteall` used in operational examples.** Replaced two occurrences (the "Removing a Dead Replica" section and the "Duplicate replica name entries" troubleshooting block) with `rmr`, which is the actual command name.

5. **`snapshot` shown as a client command.** There is no `snapshot` command in `clickhouse-keeper-client`. Snapshots are triggered via the `csnp` four-letter word. Reworked the "Running Diagnostic Queries in the Client" section to demonstrate `flwc` (which runs four-letter words from inside the client) and to show `flwc csnp` as the correct way to trigger a snapshot.

6. **Bogus `lead` four-letter word.** The post invoked `echo "lead" | nc ...`, but `lead` is not in the ClickHouse Keeper 4lw set (`ruok`, `mntr`, `srvr`, `stat`, `srst`, `conf`, `cons`, `crst`, `envi`, `dirs`, `isro`, `wchs`, `wchc`, `wchp`, `dump`, `csnp`, `lgif`, `rqld`, `ftfl`, `ydld`, `pfev`). Replaced with `srvr` filtered for the `Mode` line, which is the correct way to identify a leader/follower, and added `lgif` as a useful Raft-state command.

7. **Misleading wording on `mntr`.** The post said `mntr` is "the same as zk_metrics in ZooKeeper". `zk_metrics` isn't a thing — `mntr` returns key/value pairs that happen to be prefixed with `zk_`. Reworded the comment to reflect that.

## Review Notes

- The example default port `2181` matches the documented default for the `tcp_port` setting; many real-world ClickHouse Keeper deployments instead expose `9181`. Either is correct depending on configuration, so the post's choice is fine but worth noting.
- The four-letter-word commands require entries in `four_letter_word_white_list` in `keeper_server` config to be permitted. The post does not mention this; not strictly an inaccuracy, but operators new to Keeper sometimes hit "command is not allowed" responses because of it.
- The `zxid` values in `get_stat` examples (`0x1234`) are illustrative — that's fine for a tutorial, but a reader unfamiliar with ZAB/Raft zxid format should be aware they are not literal.
- `SYSTEM DROP REPLICA ... FROM TABLE database.events` syntax is correct. Other valid forms (`FROM DATABASE`, `FROM ZKPATH`) exist but are out of scope.
