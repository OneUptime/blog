# Validation Summary: How ClickHouse Replication Protocol Works

## Status
validated

## Post Type
Technical explainer / Reference

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine)
- ZooKeeper (coordination service)
- ClickHouse Keeper (built-in ZooKeeper alternative using Raft)
- Interserver HTTP protocol (part fetching)

## Sources Consulted
- Replicated table engines documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- system.replicas documentation: https://clickhouse.com/docs/operations/system-tables/replicas
- system.replication_queue documentation: https://clickhouse.com/docs/operations/system-tables/replication_queue
- system.replicated_fetches documentation: https://clickhouse.com/docs/operations/system-tables/replicated_fetches
- ClickHouse Keeper documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse source code (DataPartsExchange.cpp): https://github.com/ClickHouse/ClickHouse/blob/master/src/Storages/MergeTree/DataPartsExchange.cpp

## Issues Found

### 1. Insert flow incorrectly described "replaying the INSERT"
**What was wrong:** The post stated other replicas could get data "by replaying the INSERT themselves if they have the data." In reality, replicas always fetch the already-written data part from a peer via HTTP (GET_PART task); they do not re-execute the original INSERT statement.
**What was changed:** Removed the "replaying the INSERT" bullet point. The insert flow now correctly states that other replicas fetch the part from the replica that wrote it.

### 2. Part fetch HTTP endpoint was incorrect
**What was wrong:** The post showed `GET /?action=sendPart&part=20240101_1_5_2&database=default&table=events`. The actual interserver protocol uses POST (not GET), the `endpoint=DataPartsExchange:<zk_replica_path>` parameter (not `action=sendPart`), and does not use separate `database`/`table` parameters (the table identity is encoded in the ZooKeeper replica path).
**What was changed:** Replaced the URL example with the correct format: `POST /?endpoint=DataPartsExchange:/clickhouse/tables/01/events/replicas/r1&part=20240101_1_5_2&client_protocol_version=4&compress=false`.

### 3. Merge coordination description was misleading
**What was wrong:** The post stated "only one replica executes a given merge," which is not the default behavior. By default, all replicas independently execute the same merge locally on their own copies of the parts. The leader replica schedules which parts should be merged. Single-replica merge execution is an optional optimization via `execute_merges_on_single_replica_time_threshold`.
**What was changed:** Rewrote the section to clarify that the leader schedules merges, all replicas execute them independently by default, and mentioned the `execute_merges_on_single_replica_time_threshold` setting for single-replica merge execution.

## Review Notes
- The `insert_quorum` setting is valid and not deprecated. The related `insert_quorum_parallel` setting (default `true` since v21.11) controls whether quorum inserts can run in parallel but is a complementary setting, not a replacement.
- The ZooKeeper path `/clickhouse/tables/{shard}/{table}/log/...` is the conventional pattern, though some deployments include the database name in the path as well.
- All `system.replicas` column names used in queries are valid.
- The ClickHouse Keeper XML configuration shown is correct, including element names and structure.
