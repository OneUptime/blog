# Validation Summary: How to Diagnose ClickHouse Network Timeout Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (distributed queries, system tables, settings)
- SQL (system.clusters, system.processes, system.settings)
- TCP / networking (keep-alive, sysctl tuning)
- Linux `nc` (netcat) CLI
- clickhouse-client CLI
- ClickHouse server XML configuration (config.xml)

## Sources Consulted
- [ClickHouse Docs — Network ports](https://clickhouse.com/docs/guides/sre/network-ports)
- [ClickHouse Docs — Server settings](https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- [ClickHouse Docs — Settings](https://clickhouse.com/docs/en/operations/settings/settings)
- [Altinity KB — Client Timeouts](https://kb.altinity.com/altinity-kb-setup-and-maintenance/client-timeouts/)
- ClickHouse GitHub issues/PRs on distributed timeouts (azat PRs #29282, #51582, #56035)
- Linux kernel tcp(7) man page for `net.ipv4.tcp_keepalive_*` sysctls

## Issues Found
1. **Incorrect port 9009 description.** The `nc -zv shard2.internal 9009` check was commented as `# HTTP port`, but 9009 is the **interserver HTTP port** used for replication between replicas. The main HTTP interface port is 8123. Updated the comment to `# interserver HTTP port (replication)`.
2. **Non-existent setting `distributed_send_timeout`.** The `SELECT` from `system.settings` included `'distributed_send_timeout'`, which is not a real ClickHouse setting (confirmed against official docs and the ClickHouse GitHub). Removed it from the list so the query doesn't silently return an incomplete result and the list no longer implies the setting exists. Remaining names (`receive_timeout`, `send_timeout`, `connect_timeout_with_failover_ms`, `tcp_keep_alive_timeout`) are all valid.

## Review Notes
- Error codes 159 (TIMEOUT_EXCEEDED), 209 (SOCKET_TIMEOUT), and 279 (ALL_CONNECTION_TRIES_FAILED) are correct ClickHouse error codes.
- `system.clusters` columns (`shard_num`, `host_name`, `host_address`, `port`, `is_local`, `errors_count`, `estimated_recovery_time`) are all valid.
- `system.processes` columns (`query_id`, `elapsed`, `read_rows`, `memory_usage`, `query`) are all valid.
- `connect_timeout_with_failover_ms` default is 50ms — setting it to 1000 is a reasonable tuning for slow networks, as suggested.
- `skip_unavailable_shards` is a real setting and correctly used with `SETTINGS` clause.
- `<tcp_keep_alive_timeout>` is a valid server config XML element. The value 290 is a common choice (under the typical 5-minute firewall idle cutoff).
- The Linux `sysctl` keep-alive tunables are correctly named. Note: these affect the host globally, not just ClickHouse — worth mentioning in a future revision.
- Semantic nuance worth future mention: in ClickHouse, `send_timeout`/`receive_timeout` are client-side settings that map to the opposite on the server side (see PR #56035). Not an error in the post, just additional context.
