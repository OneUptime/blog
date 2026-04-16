# Validation Summary: How to Set Up a 3-Node ClickHouse Keeper Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step operational guide

## Technologies Covered
- ClickHouse Keeper (embedded coordination service)
- ClickHouse Server (ReplicatedMergeTree, ON CLUSTER DDL, `clusterAllReplicas`, `system.zookeeper_connection`)
- Raft consensus protocol
- 4-letter-word (4LW) admin commands (`ruok`, `mntr`, `stat`)
- systemd / apt-get package management on Debian/Ubuntu
- GPG keyring handling for signed apt repositories
- Bash scripting, cron, `nc` / netcat for health checks

## Sources Consulted
- ClickHouse Keeper guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse Debian/Ubuntu install docs: https://clickhouse.com/docs/install/debian_ubuntu
- `system.zookeeper_connection` reference: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- ClickHouse PR #45245 (introduced `system.zookeeper_connection` in 23.5): https://github.com/ClickHouse/ClickHouse/pull/45245
- ClickHouse Keeper 4LW whitelist default and coordination settings tables in the Keeper guide

## Issues Found
1. **GPG environment variable not exported to `gpg`** — In Step 1, the install script sets `GNUPGHOME=$(mktemp -d)` on its own line and then invokes `gpg` on the following lines. In bash this sets a shell variable that is not exported, so `gpg` never sees it and falls back to `~/.gnupg`, defeating the purpose of the temporary keyring directory. Fixed by prefixing the `gpg` invocation with `GNUPGHOME="$GNUPGHOME"` on the same command (matching the pattern used in ClickHouse's official install docs), which passes the variable to that one process.

## Review Notes
- The 4LW commands `ruok`, `mntr`, and `stat` used throughout the health-check snippets are part of the default `four_letter_word_white_list`, so they work out of the box without additional configuration.
- `raft_logs_level` is correctly placed inside `<coordination_settings>`.
- `compress_logs` and `compress_snapshots_with_zstd_format` are accepted coordination settings that appear in Keeper's `conf` output, though they are not listed in the current public coordination_settings reference table. They work but rely on less-documented behavior — worth noting for future readers.
- The install guide uses the keyserver-based GPG retrieval pattern; the most recent official docs also show a `curl | gpg --dearmor` variant. Either works; the keyserver form used here is still referenced in official material.
- Since none of the commands use `sudo`, the guide implicitly assumes the reader is running as root (consistent across Steps 1-6). This is acceptable for a server-provisioning tutorial but worth keeping in mind.
- `system.zookeeper_connection` requires ClickHouse 23.5 or newer. Not flagged since the post targets current deployments.
