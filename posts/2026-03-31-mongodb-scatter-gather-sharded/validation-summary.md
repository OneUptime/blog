# Validation Summary: How to Handle Scatter-Gather Queries in Sharded MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharded clusters)
- mongos query routing
- MongoDB sharding and shard keys
- MongoDB aggregation pipeline
- mongosh shell methods

## Sources Consulted
- MongoDB official documentation: `cursor.allowPartialResults()` method reference (https://www.mongodb.com/docs/manual/reference/method/cursor.allowPartialResults/)
- MongoDB official documentation: `serverStatus` command output and `shardingStatistics` fields (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: `explain()` output for sharded clusters and `SHARD_MERGE` stage
- MongoDB official documentation: sharded cluster query routing and scatter-gather behavior (https://www.mongodb.com/docs/manual/core/sharded-cluster-query-router/)
- MongoDB official documentation: `$out` aggregation stage behavior in sharded environments

## Issues Found

1. **`allowPartialResults(true)` incorrect method signature** (line 56): The `cursor.allowPartialResults()` method in mongosh does not accept a boolean parameter. It is a no-argument chainable cursor method; calling it is equivalent to enabling the option. Changed `.allowPartialResults(true)` to `.allowPartialResults()`.

2. **Fabricated `serverStatus` field names** (line 27-28): The comment referenced `totalBroadcastRequests` and `totalRequestsWithTargetedShards` as fields under `db.serverStatus().shardingStatistics`. These field names do not exist in MongoDB documentation across any version. The actual field for monitoring query targeting distribution is `numHostsTargeted` (added in MongoDB 4.4), which categorizes CRUD and aggregation operations by how many shards they target. Updated the comment to reference `numHostsTargeted`.

## Review Notes
- The `SHARD_MERGE` stage name in `explain()` output is correct, though it's worth noting that `SHARD_MERGE` indicates any multi-shard query, not exclusively scatter-gather. A targeted range query hitting multiple shards could also show `SHARD_MERGE`. The blog's use as a scatter-gather indicator is a reasonable simplification for the intended audience.
- The `$out` stage is used for caching results. While correct, `$merge` (available since MongoDB 4.2) is generally preferred in production as it supports incremental updates rather than full collection replacement. This is a best-practice note, not an error.
- The shard key advice correctly warns about cardinality and hotspot concerns with low-cardinality prefix fields like `status`.
