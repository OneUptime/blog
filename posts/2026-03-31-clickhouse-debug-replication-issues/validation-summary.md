# Validation Summary: How to Debug Replication Issues in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree replication)
- ZooKeeper / ClickHouse Keeper
- System tables: `system.replicas`, `system.replication_queue`, `system.zookeeper`
- SQL-level SYSTEM commands: `SYSTEM RESTART REPLICA`, `SYSTEM SYNC REPLICA`, `SYSTEM DROP REPLICA`
- `clickhouse-client` CLI
- Bash / systemd service management
- Prometheus (mentioned in context of lag alerting)

## Sources Consulted
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `system.replication_queue` docs: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse `system.zookeeper` docs: https://clickhouse.com/docs/en/operations/system-tables/zookeeper
- ClickHouse SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system
- Apache ZooKeeper administration (4-letter commands): https://zookeeper.apache.org/doc/current/zookeeperAdmin.html

## Issues Found
No technical issues found.

All column names in `system.replicas` (`database`, `table`, `is_leader`, `is_readonly`, `total_replicas`, `active_replicas`, `queue_size`, `inserts_in_queue`, `merges_in_queue`, `log_max_index`, `log_pointer`, `is_session_expired`, `replica_path`, `replica_name`) are valid. All `system.replication_queue` columns referenced are valid. The `SYSTEM RESTART REPLICA [db.]table`, `SYSTEM SYNC REPLICA [db.]table`, and `SYSTEM DROP REPLICA 'replica_name' FROM TABLE db.table` syntaxes all match the official grammar. The `system.zookeeper` query correctly includes the required `path =` predicate.

## Review Notes
- The `is_leader` column is not formally deprecated but in modern multi-leader ClickHouse replication it is less informative than it once was — multiple replicas can be leaders concurrently (see `replicated_can_become_leader` setting).
- The `echo "stat" | nc zookeeper-host 2181` command is correct, but on ZooKeeper 3.5.3+ the four-letter `stat` command is disabled by default. Operators may need to whitelist it via `4lw.commands.whitelist` in `zoo.cfg` before it works. Not a correctness issue in the post, but a deployment caveat worth mentioning.
- The `SYSTEM DROP REPLICA` step in the recovery flow is correctly targeted at a different (healthy) host via `--host ch-node-1`, which is the right pattern since the bad replica's own server is stopped.
