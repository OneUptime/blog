# Validation Summary: How to Recover a Failed ClickHouse Replica

## Status
validated

## Post Type
Operations Guide / Tutorial

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine, replication system)
- ZooKeeper / ClickHouse Keeper (coordination service)
- system.replicas and system.replication_queue system tables
- SYSTEM replication commands (RESTART REPLICA, SYNC REPLICA, RESTORE REPLICA, DROP REPLICA)

## Sources Consulted
- ClickHouse SYSTEM statements documentation: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse system.replicas table documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse system.replication_queue table documentation: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse DETACH TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/detach

## Issues Found

### 1. SYSTEM RESTORE REPLICA description was fundamentally incorrect
- **What was wrong:** The post described `SYSTEM RESTORE REPLICA` as removing local parts not tracked in ZooKeeper and scheduling fetches for missing parts. This is the opposite of what the command does.
- **What was changed:** Corrected the description. `SYSTEM RESTORE REPLICA` rebuilds ZooKeeper metadata from locally present data when ZK metadata is lost. It works only on read-only ReplicatedMergeTree tables and avoids re-downloading data by re-registering local parts in ZooKeeper.
- **Why:** The official documentation states it "Restores a replica if data is [possibly] present but Zookeeper metadata is lost" and "Parts present on a replica before metadata loss are not re-fetched."

### 2. DETACH TABLE comment was incorrect
- **What was wrong:** The SQL comment said "keep it accessible but stop replication." DETACH TABLE actually makes the table completely inaccessible.
- **What was changed:** Updated comment to "makes it inaccessible but preserves data on disk."
- **Why:** ClickHouse documentation states DETACH makes the server "forget about the existence of a table" and queries against it will fail.

### 3. SYSTEM SYNC REPLICA STRICT description was misleading
- **What was wrong:** The post implied STRICT mode adds a timeout (default 300 seconds) and raises an error on timeout. In reality, the `receive_timeout` (default 300s) applies to the base command too. STRICT changes the completion criteria to require a completely empty replication queue.
- **What was changed:** Clarified that the base command waits up to `receive_timeout` seconds, and STRICT waits until the queue is completely empty. Added a warning that STRICT may never return if new entries keep appearing.
- **Why:** Per official docs, STRICT "waits for the replication queue to become empty" and "may never succeed if new entries constantly appear."

### 4. SYSTEM DROP REPLICA usage context was wrong
- **What was wrong:** The post suggested running `SYSTEM DROP REPLICA` as if it could be executed on the failed replica itself. The official docs explicitly state this command "cannot drop local replica."
- **What was changed:** Updated the comment to clarify it must be run on a healthy replica, and changed the follow-up instructions to say the table should be recreated on the recovered node.
- **Why:** ClickHouse documentation explicitly states the command removes only inactive/stale replicas and cannot drop the local replica.

## Review Notes
- All columns referenced in `system.replicas` queries (database, table, is_leader, is_readonly, absolute_delay, queue_size, inserts_in_queue, merges_in_queue, last_queue_update_exception, zookeeper_path, replica_name, replica_path) are verified to exist.
- All columns referenced in `system.replication_queue` queries (database, table, type, new_part_name, num_tries, last_exception, last_attempt_time) are verified to exist.
- The `SYSTEM RESTART REPLICA` and `SYSTEM RESTART REPLICAS` commands are correctly documented.
- The ZooKeeper CLI commands (`zkCli.sh`, `deleteall`) are standard and correct.
- The `clusterAllReplicas` function usage in the verification checklist is syntactically valid.
- The disk recovery workflow (Step 6) is operationally sound — ClickHouse does detect existing ZK registrations and recover automatically on restart with an empty data directory.
