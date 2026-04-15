# Validation Summary: What Is the Difference Between ReplicatedMergeTree and MergeTree

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- ClickHouse MergeTree engine
- ClickHouse ReplicatedMergeTree engine
- ClickHouse Keeper / Apache ZooKeeper (coordination service)
- ClickHouse Distributed table engine
- ClickHouse system tables (system.replication_queue, system.replicas)

## Sources Consulted
- ClickHouse official documentation: ReplicatedMergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse official documentation: system.replication_queue — https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse official documentation: system.replicas — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found

### Issue 1: Incorrect column name in system.replication_queue query
- **What was wrong:** The query used `is_done` in both the SELECT list and WHERE clause. The `system.replication_queue` table does not have an `is_done` column (`is_done` belongs to `system.mutations`). Entries in the replication queue are pending tasks; completed tasks are removed from the queue automatically.
- **What was changed:** Replaced `is_done` with `is_currently_executing` in the SELECT list and removed the `WHERE is_done = 0` filter, since all entries in the queue are inherently pending.
- **Why:** Running the original query would produce a "column not found" error.

### Issue 2: Incorrect terminology "leader replica" in replication description
- **What was wrong:** Step 3 of "How Replication Works" stated that other replicas "pull the data part from the leader replica using HTTP." In ClickHouse, the "leader" replica is the one elected to schedule background merges, not the one that received the insert. Any replica can receive inserts.
- **What was changed:** Changed "leader replica" to "source replica" to accurately describe the replica that received the insert and holds the data part.
- **Why:** Using "leader" here conflates two different concepts in ClickHouse replication and could mislead readers about how the replication protocol works.

## Review Notes
- The post correctly notes that ClickHouse Keeper is now the more common coordination service over Apache ZooKeeper.
- The `select_sequential_consistency` setting is correctly described but worth noting it may have performance implications for read-heavy workloads since it requires a round-trip to Keeper.
- The conversion procedure (MergeTree to ReplicatedMergeTree) is correct but for very large tables, using `ALTER TABLE ATTACH PARTITION` would be more efficient than `INSERT ... SELECT`.
- All MergeTree variant mappings to Replicated counterparts are accurate and complete.
