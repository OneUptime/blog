# Validation Summary: How to Install ClickHouse Keeper from Scratch

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse Keeper (standalone coordination service)
- ZooKeeper (referenced as the legacy coordination protocol Keeper replaces)
- Raft consensus protocol
- systemd (service management)
- APT package manager (Debian/Ubuntu)
- XML configuration
- `nc` / netcat (for 4lw verification commands)

## Sources Consulted
- ClickHouse Keeper guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse Debian/Ubuntu install docs: https://clickhouse.com/docs/install/debian_ubuntu
- `clickhouse-keeper-client` reference: https://clickhouse.com/docs/operations/clickhouse-keeper-client

## Issues Found
- **Verification commands used the wrong tool.** The original post invoked `clickhouse-keeper-client -h localhost -p 9181 -q "ruok"` (and the same for `mntr` and `stat`). `clickhouse-keeper-client` is a znode-operations client (`ls`, `get`, `set`, etc.); the `-q` flag executes znode queries, not four-letter-word (4lw) commands. The official ClickHouse Keeper docs explicitly show 4lw commands being sent directly to the TCP port via `nc` or `telnet` (e.g., `echo mntr | nc localhost 9181`). Replaced the three `clickhouse-keeper-client -q` invocations with `echo <cmd> | nc localhost 9181`, and updated the surrounding sentence from "Use the built-in client to check status" to "Send the four-letter-word (4lw) commands directly to the TCP port using `nc`" so the prose matches the corrected commands.

## Review Notes
- Package name (`clickhouse-keeper`), default ports (9181 client, 9234 Raft), config path (`/etc/clickhouse-keeper/keeper_config.xml`), and the entire XML schema (`<clickhouse>` root, `<keeper_server>`, `<coordination_settings>`, `<raft_configuration>`, plus all child element names) all match the official ClickHouse documentation.
- The `stat` 4lw output is correctly described as containing a `Mode:` line showing `leader` / `follower` (also `standalone` for single-node setups, not mentioned but unlikely to confuse readers given the 3-node cluster context).
- The `clickhouse` user/group ownership for `/var/lib/clickhouse/coordination` is correct — both the `clickhouse-server` and `clickhouse-keeper` packages create that user.
- Minor caveat (not fixed, no error): the post does not mention enabling the 4lw whitelist via `four_letter_word_white_list` in `<coordination_settings>`. This is unnecessary in practice because `ruok`, `mntr`, and `stat` are all included in the default whitelist, so the verification commands will work out of the box.
- The post does not pin a ClickHouse version. The configuration shown is compatible with all recent (2023+) ClickHouse releases that ship `clickhouse-keeper` as a standalone package.
