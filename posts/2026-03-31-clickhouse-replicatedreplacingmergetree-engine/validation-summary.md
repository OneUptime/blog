# Validation Summary: How to Use ReplicatedReplacingMergeTree Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplicatedReplacingMergeTree engine
- ReplacingMergeTree engine
- ReplicatedMergeTree engine
- ClickHouse Keeper / ZooKeeper (replication coordination)
- system.replicas system table

## Sources Consulted
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse Replication documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas

## Issues Found
1. **Incorrect deduplication key terminology in intro paragraph**: The original text stated that ReplicatedReplacingMergeTree stores "only the latest version of each row identified by its primary key." According to the official ClickHouse documentation, ReplacingMergeTree deduplicates by the **sorting key** (defined by `ORDER BY`), not the primary key. In ClickHouse, the primary key can be a prefix of the sorting key, and when they differ, deduplication still operates on the sorting key. Changed "identified by its primary key" to "identified by its sorting key (the `ORDER BY` columns)." Note: the explanation later in the post (line 38) correctly referred to "ORDER BY key" — this fix brings the intro in line with that correct usage.

## Review Notes
- All SQL code examples are syntactically correct and use valid ClickHouse syntax.
- The ReplicatedReplacingMergeTree engine parameter order (zoo_path, replica_name, ver) is correct per official documentation.
- The `FINAL` modifier and `argMax` query patterns are both valid approaches for querying deduplicated results, and the post correctly notes the performance trade-off.
- All six system.replicas columns queried (replica_name, is_leader, total_replicas, active_replicas, queue_size, absolute_delay) are confirmed to exist in the system table.
- The comparison table between ReplicatedMergeTree and ReplicatedReplacingMergeTree is accurate.
- The warning about avoiding `OPTIMIZE TABLE ... FINAL` in production on large tables is good advice.
