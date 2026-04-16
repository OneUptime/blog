# Validation Summary: How to Fix 'Table is in readonly mode' in ClickHouse

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ZooKeeper / ClickHouse Keeper
- SQL (ClickHouse dialect)
- Linux shell utilities (df, du, nc)
- XML configuration

## Sources Consulted
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse system.zookeeper documentation: https://clickhouse.com/docs/operations/system-tables/zookeeper
- ClickHouse system.zookeeper_connection: https://clickhouse.com/docs/operations/system-tables/zookeeper_connection
- ClickHouse system.replication_queue: https://clickhouse.com/docs/operations/system-tables/replication_queue
- ClickHouse SYSTEM statements: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse ZooKeeper configuration: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- Apache ZooKeeper four-letter words documentation

## Issues Found
No technical issues found. All SQL queries, system table columns (`is_readonly`, `is_session_expired`, `future_parts`, `queue_size`, `last_exception`, `zookeeper_path`), SYSTEM commands (`RESTART REPLICA`, `RESTART REPLICAS`, `SYNC REPLICA`), XML configuration format, and shell commands verified against official ClickHouse documentation.

## Review Notes
- The `echo ruok | nc` and `echo stat | nc` four-letter-word commands require whitelisting in `zoo.cfg` via `4lw.commands.whitelist` for ZooKeeper 3.5+ (disabled by default). This is a common ZooKeeper admin detail that users typically discover quickly; the commands shown are correct when whitelisting is enabled.
- The `SET readonly = 0` example works to reset within a session only if the current effective `readonly` setting is 2 (read + change settings). If readonly=1, the SET itself is blocked — the user would need to authenticate with a non-readonly profile. This is implied by the "Check user setting" preface but could trip up readers in some configurations.
- The post correctly distinguishes between replicated table readonly mode (ZooKeeper-driven) and user-setting readonly mode, which is a common source of confusion.
