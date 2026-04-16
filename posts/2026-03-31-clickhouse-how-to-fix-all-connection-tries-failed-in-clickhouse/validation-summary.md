# Validation Summary: How to Fix 'All connection tries failed' in ClickHouse

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- ClickHouse (distributed clusters, `system.clusters`, `system.query_log`)
- ClickHouse settings: `skip_unavailable_shards`, `connect_timeout_with_failover_ms`, `connections_with_failover_max_tries`, `distributed_connections_pool_size`
- `remote_servers` XML configuration
- Linux networking and diagnostics tools (`nc`, `curl`, `dig`, `nslookup`, `ss`, `iptables`)
- systemd service management (`systemctl`, `journalctl`)

## Sources Consulted
- ClickHouse `system.clusters` docs: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse `system.query_log` docs: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse `SYSTEM RELOAD CONFIG`: https://clickhouse.com/docs/en/sql-reference/statements/system#reload-config
- ClickHouse `remote_servers` configuration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#remote-servers
- ClickHouse Distributed engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse error codes (`ALL_CONNECTION_TRIES_FAILED` = 279): ClickHouse source `src/Common/ErrorCodes.cpp`

## Issues Found
1. **Incorrect column name in `system.query_log` query.** The monitoring query used `host_name`, but the correct column name in `system.query_log` is `hostname` (a `LowCardinality(String)` column). Note: `system.clusters` does use `host_name` — the two tables differ. Fixed both the SELECT list and GROUP BY.
2. **Incorrect config reload mechanism.** The post advised `kill -HUP $(pidof clickhouse-server)` to reload config without restart. ClickHouse does not document SIGHUP as a reload trigger; it auto-reloads config files on modification (polled every `config_reload_interval_ms`, default 2000ms), and the canonical explicit method is `SYSTEM RELOAD CONFIG`. Replaced the SIGHUP guidance with the auto-reload note and `SYSTEM RELOAD CONFIG;`.

## Review Notes
- The error code `ALL_CONNECTION_TRIES_FAILED` (279) and the general shape of the error message are accurate; the exact wording can vary slightly depending on the failure path (e.g., DNS vs. TCP vs. all-replicas-exhausted), but the name/code are canonical.
- All referenced settings (`skip_unavailable_shards`, `connect_timeout_with_failover_ms`, `connections_with_failover_max_tries`, `distributed_connections_pool_size`, `connect_timeout`, `receive_timeout`, `send_timeout`) are valid.
- The `<remote_servers>` XML structure is canonical; additional optional children exist (`<weight>`, `<internal_replication>`, `<user>`, `<password>`, `<secure>`, `<priority>`) but are not required for this troubleshooting context.
- `system.query_log.hostname` was added in the v22.x era — on older clusters this column may not exist, in which case `hostName()` function over a distributed table would be the workaround. Not called out explicitly in the post, but worth noting for readers on legacy versions.
