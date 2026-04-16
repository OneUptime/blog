# Validation Summary: How to Fix 'ZooKeeper session expired' in ClickHouse

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- ClickHouse (replicated tables, system tables, config.xml)
- Apache ZooKeeper (zoo.cfg, 4-letter commands)
- ClickHouse Keeper (built-in ZooKeeper replacement with Raft)
- SQL (system.zookeeper_connection, system.replicas)
- Linux shell / nc / grep

## Sources Consulted
- ClickHouse Keeper guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- system.zookeeper_connection: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- system.replicas: https://clickhouse.com/docs/operations/system-tables/replicas
- ZooKeeper Administrator's Guide: https://zookeeper.apache.org/doc/r3.7.2/zookeeperAdmin.html
- ClickHouse GitHub issues on KEEPER_EXCEPTION / session expiry

## Issues Found
No technical issues found. All claims verified:
- Default ClickHouse ZooKeeper `session_timeout_ms` of 30000ms is correct.
- `system.zookeeper_connection` and `system.replicas` tables and columns (`database`, `table`, `replica_name`, `is_readonly`, `zookeeper_path`) are valid.
- ClickHouse Keeper default client port 9181 and Raft inter-server port 9234 are correct.
- `keeper_server` XML structure (tcp_port, server_id, log_storage_path, snapshot_storage_path, raft_configuration/server) matches official docs.
- ZooKeeper 4-letter commands `mntr` and `srvr` are valid.
- `zoo.cfg` parameters `tickTime`, `initLimit`, `syncLimit`, `maxClientCnxns` are all valid.
- Error text "ZooKeeper session has been expired. (KEEPER_EXCEPTION)" matches the format emitted by ClickHouse.

## Review Notes
- `DETACH TABLE` / `ATTACH TABLE` works to force re-connection, but on modern ClickHouse (21.7+) `SYSTEM RESTART REPLICA <table>` is the idiomatic, lighter-weight alternative and `SYSTEM RESTORE REPLICA` is used for metadata loss scenarios. The author's recommendation is not wrong — just heavier-handed than necessary — so no edit was made.
- The `mntr` 4-letter command may require whitelisting via `4lw.commands.whitelist` in newer ZooKeeper versions (3.5+). Readers on locked-down clusters may need to enable it.
- Values like `session_timeout_ms=60000`, `tickTime=4000`, `initLimit=20`, `syncLimit=10` are reasonable tuning examples but environment-dependent; the post correctly frames these as adjustments rather than absolute recommendations.
