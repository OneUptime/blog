# Validation Summary: How ClickHouse Distributed Query Planning Works

## Status
validated

## Post Type
Technical Guide / Reference

## Technologies Covered
- ClickHouse (Distributed table engine, ReplicatedMergeTree)
- SQL (DDL and query examples)
- Distributed query execution and sharding concepts

## Sources Consulted
- ClickHouse documentation: Distributed Table Engine — https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse documentation: ReplicatedMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse documentation: Settings (`optimize_skip_unused_shards`, `distributed_group_by_no_merge`) — https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse documentation: Distributed JOINs and the `GLOBAL` modifier — https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
- **Sharding key shard pruning claim was incomplete.** The post stated that "queries that filter on the sharding key can skip shards entirely" without mentioning that ClickHouse does NOT do this by default. Shard pruning requires `optimize_skip_unused_shards = 1` (default is 0). Without the setting, queries still fan out to all shards even when filtered on the sharding key. Fixed by adding the setting caveat and a `SET optimize_skip_unused_shards = 1;` line before the example.

## Review Notes
- The `Distributed(cluster, database, table, sharding_key)` DDL syntax is correct. In practice, authors often use a hash function like `cityHash64(user_id)` as the sharding key to avoid hot shards when the key distribution is skewed; using a raw UInt64 column works but may distribute unevenly.
- The `distributed_group_by_no_merge = 0` default behavior is described correctly (coordinator merges partial aggregates from shards). Values `1` and `2` exist for more advanced cases but are out of scope for this post.
- The `GLOBAL JOIN` example is correct: without `GLOBAL`, a JOIN subquery executes on each shard against its local data, producing incorrect results when the right-side dataset is not fully present on every shard. With `GLOBAL`, the subquery is computed on the initiator and broadcast to all shards.
- The EXPLAIN example is accurate — distributed aggregation typically shows `Aggregating` / `MergingAggregated` stages, with aggregation happening both at shards and at the coordinator.
- Additional settings that could be mentioned in future revisions: `optimize_skip_unused_shards_limit`, `force_optimize_skip_unused_shards`, and `prefer_localhost_replica`.
