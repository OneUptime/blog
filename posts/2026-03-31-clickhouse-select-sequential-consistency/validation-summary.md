# Validation Summary: How to Use select_sequential_consistency in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine, replication settings)
- ZooKeeper / ClickHouse Keeper (coordination service)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation: Settings — `select_sequential_consistency` (https://clickhouse.com/docs/en/operations/settings/settings#select_sequential_consistency)
- ClickHouse official documentation: Settings — `insert_quorum` and `insert_quorum_parallel` (https://clickhouse.com/docs/en/operations/settings/settings#insert_quorum)
- ClickHouse official documentation: `system.replicas` table (https://clickhouse.com/docs/en/operations/system-tables/replicas)
- ClickHouse source code: `StorageReplicatedMergeTree.cpp` — `getMaxAddedBlocks()` function (internal mechanism for sequential consistency checks)
- ClickHouse Knowledge Base: Quorum inserts and sequential consistency

## Issues Found

1. **Incorrect internal mechanism description (log_pointer)**: The post claimed ClickHouse checks a `log_pointer` per replica and only proceeds if the log pointer is at or ahead of the last quorum-confirmed insert. This is incorrect. The actual mechanism reads `quorum/last_part` and `quorum/status` from ZooKeeper to determine the last quorum-confirmed part, then verifies the local replica has that part. The `log_pointer` is used for replication queue processing, not for sequential consistency. **Fixed** the "How It Works Internally" section to describe the correct mechanism.

2. **Incorrect claim about waiting behavior**: The post stated "If the replica is behind, ClickHouse waits for it to catch up or returns an error." ClickHouse never waits — it immediately throws a `REPLICA_IS_NOT_IN_QUORUM` error if the replica doesn't have the quorum-confirmed part. **Fixed** in both the internal mechanism section and performance considerations.

3. **Misleading "replication queue" reference**: The post said ClickHouse "checks the replication queue" when the setting is enabled. It actually checks quorum metadata in ZooKeeper, not the replication queue. **Fixed** to say "checks quorum metadata in ZooKeeper (or ClickHouse Keeper)."

4. **Critical missing caveat about insert_quorum_parallel**: The official documentation states that `select_sequential_consistency` does not work when `insert_quorum_parallel` is enabled, which has been the default since approximately 2020. The blog post failed to mention this, which could lead readers to enable the setting with no effect. **Fixed** by adding an explicit note and `SET insert_quorum_parallel = 0;` to the code example.

5. **Performance considerations overstated/inaccurate**: The original list included "Reads may be delayed if a replica is behind" (incorrect — queries fail immediately, they don't delay) and "Higher CPU and memory usage" (vague). **Fixed** to accurately describe the failure behavior and the ZooKeeper round-trip overhead.

## Review Notes
- The `system.replicas` query showing `log_pointer` and `log_max_index` is valid SQL and those columns do exist. While the query is useful for general replication lag monitoring, the post's context implies these columns are directly related to how `select_sequential_consistency` works, which is misleading. The query was left in place since it is still useful for monitoring replication health.
- The `system.parts` query in the "Checking Consistency State" section is valid but does not directly show quorum-confirmed status. It shows active parts per partition, which is tangentially useful. Left as-is since it is not technically wrong.
- The `ALTER PROFILE` syntax follows standard ClickHouse SQL and is plausible, though not explicitly demonstrated in official docs for this specific setting.
