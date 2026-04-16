# Validation Summary: How to Fix 'Network is unreachable' for ClickHouse Replication

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- ClickHouse (replication, interserver HTTP transport, system tables)
- ZooKeeper / ClickHouse Keeper
- Linux networking tools: `nc`, `dig`, `host`, `ping`, `ss`, `iptables`
- systemd / systemd-resolved
- Bash scripting

## Sources Consulted
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `system.clusters` docs: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse `system.replication_queue` docs: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse `system.zookeeper` docs: https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse server configuration reference (listen_host, interserver_http_port, interserver_http_host): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- Default ClickHouse ports (9000 native, 9009 interserver, 9181 Keeper): https://clickhouse.com/docs/en/guides/sre/network-ports
- Apache ZooKeeper default client port 2181: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html

## Issues Found
1. **Incorrect column name in `system.clusters` query.** The original query used `host_port`, which does not exist. The actual column is `port` (UInt16). Changed `host_port` → `port` in the diagnostic query.
2. **Non-existent column referenced in `system.replicas` query.** The original Fix 5 query selected `host_name` from `system.replicas`, but that column does not exist on `system.replicas`. Replaced the query with a two-step approach: first select `replica_path` from `system.replicas`, then inspect the `host` value stored in ZooKeeper by querying `system.zookeeper` with a `path =` predicate against `/clickhouse/tables/{shard}/events/replicas/{replica}`. This is the correct documented way to check what hostname ZooKeeper has registered for a replica.

## Review Notes
- Default ports referenced (9000 native, 9009 interserver HTTP, 2181 ZooKeeper client, 9181 ClickHouse Keeper) are all correct.
- `nc -zv`, `nc -zw3`, `dig`, `host`, `ss -tlnp`, and `iptables` flags are all valid.
- `listen_host`, `interserver_http_port`, and `interserver_http_host` are all valid top-level configuration elements in `config.xml`.
- `systemctl restart systemd-resolved` and `resolvectl flush-caches` are correct for systems using systemd-resolved.
- `system.replication_queue` columns `table`, `type`, `source_replica`, `last_exception`, `num_tries` are all confirmed valid.
- Consider noting in a future revision that `system.replicas` also exposes `replica_is_active` (Map(String, UInt8)) which can quickly show which replicas the current node considers reachable.
