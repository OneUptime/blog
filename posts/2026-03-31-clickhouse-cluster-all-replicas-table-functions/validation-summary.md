# Validation Summary: How to Use cluster() and clusterAllReplicas() Table Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- ClickHouse Distributed table engine
- ClickHouse `cluster()` and `clusterAllReplicas()` table functions
- ClickHouse `remote_servers` cluster configuration (XML)

## Sources Consulted
- [ClickHouse cluster / clusterAllReplicas table functions documentation](https://clickhouse.com/docs/en/sql-reference/table-functions/cluster)
- [ClickHouse Distributed table engine documentation](https://clickhouse.com/docs/en/engines/table-engines/special/distributed)
- [ClickHouse PR #33392: Replace old _shard_num implementation with shardNum() function](https://github.com/ClickHouse/ClickHouse/pull/33392)
- [ClickHouse PR #7624: Add _shard_num virtual column for the Distributed engine](https://github.com/ClickHouse/ClickHouse/pull/7624)

## Issues Found
- **Wrong virtual column name** in the first SQL example. The post used `shard_num`, but ClickHouse exposes the shard identifier as the virtual column `_shard_num` (leading underscore). Updated the `SELECT`, `GROUP BY`, and `ORDER BY` clauses to use `_shard_num`.

## Review Notes
- The function signatures `cluster(cluster_name, db, table)` and `clusterAllReplicas(cluster_name, db, table)` are accurate, as is the alternate `cluster('cluster_name', db.table)` form used in the `system.parts` example.
- The XML `remote_servers` snippet matches ClickHouse's documented configuration format.
- The behavior contrast (one replica per shard vs. every replica on every shard) is correct.
- Modern ClickHouse also exposes `shardNum()` and `shardCount()` functions as a successor pattern to the `_shard_num` virtual column. `_shard_num` itself is still supported and remains the conventional way to group by shard, so the post's approach is fine; this is noted only as a forward-looking improvement.
- The "Sharding key | N/A (read only)" entry in the comparison table is a slight simplification — `cluster()` does accept an optional `sharding_key` argument for inserts — but the post frames the function as a read-only tool, which is its overwhelmingly common usage, so no change was made.
