# Validation Summary: How to Plan ClickHouse Scaling Strategy

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (system tables, ReplicatedMergeTree, Distributed tables, sharding, replication)
- SQL (ClickHouse dialect)
- ZooKeeper / ClickHouse Keeper (for replication coordination)

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.parts documentation: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse ReplicatedMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replication
- ClickHouse scaling/rebalancing guide: https://clickhouse.com/docs/guides/sre/scaling-clusters
- ClickHouse monitoring and expensive queries: https://clickhouse.com/docs/knowledgebase/finding_expensive_queries_by_memory_usage

## Issues Found
- **Incorrect column name in memory usage query (line 22):** The query used `peak_memory_usage` which is not a valid column in `system.query_log`. Changed to `memory_usage`, which is the correct column name per the official documentation.

## Review Notes
- The `ProfileEvents.Values[indexOf(ProfileEvents.Names, 'UserTimeMicroseconds')]` syntax on line 17 still works but is the legacy pattern. Modern ClickHouse stores ProfileEvents as `Map(String, UInt64)`, so the idiomatic syntax is `ProfileEvents['UserTimeMicroseconds']`. Left as-is since the old syntax remains functional.
- The ReplicatedMergeTree example uses hardcoded zoo_path and replica_name strings. In production, ClickHouse recommends using macros (e.g., `{shard}`, `{replica}`). This is a best-practice note, not an error.
- The resharding section describes using `INSERT INTO ... SELECT` for data migration. The official ClickHouse docs list this as a last-resort method; they recommend partition detach/reattach as a more efficient approach for moving existing data between shards. The blog's method is functional but not the most efficient option.
