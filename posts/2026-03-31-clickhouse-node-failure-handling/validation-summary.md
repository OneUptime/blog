# Validation Summary: How to Handle Node Failures in ClickHouse Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, Distributed table engine)
- ZooKeeper / ClickHouse Keeper (coordination service)
- Linux systemd (service management)

## Sources Consulted
- ClickHouse system.replicas table documentation — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse SYSTEM statements documentation — https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse SYSTEM RESTORE REPLICA documentation — https://clickhouse.com/docs/en/sql-reference/statements/system#restore-replica
- ClickHouse system.text_log table documentation — https://clickhouse.com/docs/en/operations/system-tables/text_log
- ClickHouse settings documentation (skip_unavailable_shards, connect_timeout_with_failover_ms, connections_with_failover_max_tries) — https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse ZooKeeper configuration documentation — https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings

## Issues Found

### 1. Incorrect claim that data is fetched from ZooKeeper
- **What was wrong:** A comment in the insert behavior section stated "the failed replica fetches it from ZooKeeper when it recovers." ZooKeeper (or ClickHouse Keeper) only stores replication log metadata and coordination data, not actual data parts.
- **What was changed:** Updated the comment to "fetches missing data parts from other replicas when it recovers."
- **Why:** Data parts are always fetched from peer replicas, not from ZooKeeper. This is a fundamental aspect of ClickHouse replication architecture.

### 2. Incorrect use of SYSTEM RESTORE REPLICA for full data resync
- **What was wrong:** The "When a Node Has Been Down Too Long" section recommended `SYSTEM RESTORE REPLICA database.table_name` to "force a complete resync from another replica." This command is specifically for restoring ZooKeeper metadata when it has been lost while local data files still exist on disk. It does not trigger a full data resync from other replicas.
- **What was changed:** Replaced the `SYSTEM RESTORE REPLICA` recommendation with the correct approach: dropping the local table with `DROP TABLE ... SYNC` and recreating it with the original DDL, which causes the replica to re-register in ZooKeeper and fetch all data parts from healthy peers.
- **Why:** Per official documentation, `SYSTEM RESTORE REPLICA` "restores a replica if data is [possibly] present but Zookeeper metadata is lost." It works only on read-only ReplicatedMergeTree tables after ZooKeeper metadata loss and reattaches local data parts rather than downloading from peers.

## Review Notes
- The `system.replicas` columns used throughout the post (database, table, replica_name, is_leader, is_readonly, active_replicas, total_replicas, absolute_delay, last_queue_update_exception, queue_size, inserts_in_queue, log_pointer, log_max_index) are all verified as valid.
- SYSTEM commands (STOP MERGES, STOP REPLICATION QUEUES, RESTART REPLICAS, RESTART REPLICA) all use correct syntax.
- The `system.text_log` query correctly uses 'Error' and 'Warning' as valid level enum values.
- The Distributed DDL configuration and query-level failover settings (skip_unavailable_shards, connect_timeout_with_failover_ms, connections_with_failover_max_tries) are all valid.
- The post mentions ClickHouse Keeper and ZooKeeper interchangeably by referring only to ZooKeeper. Modern ClickHouse deployments may use ClickHouse Keeper instead, but the concepts and commands are identical, so this is not an error.
