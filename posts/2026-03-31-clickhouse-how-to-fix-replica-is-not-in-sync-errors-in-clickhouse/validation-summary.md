# Validation Summary: How to Fix 'Replica is not in sync' Errors in ClickHouse

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- ClickHouse (replicated tables, ReplicatedMergeTree)
- ZooKeeper / ClickHouse Keeper
- SQL (system.replicas, system.replication_queue, system.parts)
- `SYSTEM` administrative statements (SYNC REPLICA, START FETCHES, RESTART REPLICA, DROP REPLICA)
- systemd / shell commands for node management

## Sources Consulted
- ClickHouse SYSTEM Statements: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse system.replicas table: https://clickhouse.com/docs/operations/system-tables/replicas
- ClickHouse system.replication_queue table: https://clickhouse.com/docs/operations/system-tables/replication_queue
- Altinity KB — Replication problems: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-check-replication-ddl-queue/
- Altinity KB — Add/Remove a replica: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-data-migration/add_remove_replica/

## Issues Found
1. **Invalid syntax `ALTER TABLE ... DROP REPLICA` in Fix 3.** ClickHouse has no `ALTER TABLE ... DROP REPLICA` statement; the correct form is `SYSTEM DROP REPLICA 'replica_name' FROM TABLE db.table`. Replaced the statement and updated the accompanying comment — the original comment claimed this would "remove a specific stuck entry" from the queue, but `DROP REPLICA` actually removes an entire dead replica's metadata from ZooKeeper.
2. **Fabricated `clickhouse-zookeeper-cleanup` tool in Fix 4.** No such CLI utility ships with ClickHouse. Replaced it with the documented approach: run `SYSTEM DROP REPLICA 'lagging-node' FROM TABLE analytics.events` from another healthy replica to remove the metadata from ZooKeeper/Keeper, then restart the server on the recovering node.

## Review Notes
- All column names referenced in `system.replicas` (`is_leader`, `is_readonly`, `is_session_expired`, `future_parts`, `parts_to_check`, `queue_size`, `inserts_in_queue`, `merges_in_queue`, `log_max_index`, `log_pointer`, `absolute_delay`) and `system.replication_queue` (`type`, `create_time`, `required_quorum`, `source_replica`, `new_part_name`, `num_tries`, `last_exception`, `last_attempt_time`) are valid.
- `SYSTEM SYNC REPLICA ... STRICT` is a valid modifier per ClickHouse docs; it waits for the replication queue to become fully empty and may never succeed under continuous writes — users should be aware of this caveat.
- The error text pairing (`REPLICA_IS_NOT_IN_ACTIVE_STATE` with "Replica is not in sync with other replicas") is illustrative; ClickHouse wording varies across versions, but the error code itself exists.
- `ALTER TABLE ... DROP DETACHED PART` is valid, but note it only operates on parts already in the `detached/` directory; users facing an active-but-corrupt part should detach it first with `ALTER TABLE ... DETACH PART`.
- `insert_quorum_timeout` is specified in milliseconds (60000 = 60s), which matches documented defaults.
