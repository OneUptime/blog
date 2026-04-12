# Validation Summary: How to Choose Shard Keys for Query Isolation in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (sharding, shard keys, query routing)
- MongoDB Shell (`mongosh`) commands and helpers
- MongoDB Profiler
- MongoDB `explain()` plan analysis

## Sources Consulted
- MongoDB official documentation on sharding and shard keys: https://www.mongodb.com/docs/manual/sharding/
- MongoDB documentation on hashed sharding: https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB documentation on ranged sharding: https://www.mongodb.com/docs/manual/core/ranged-sharding/
- MongoDB documentation on `sh.shardCollection()`: https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB documentation on targeted vs broadcast operations: https://www.mongodb.com/docs/manual/core/sharded-cluster-query-router/
- MongoDB documentation on `explain()` output for sharded clusters: https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB documentation on database profiler: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB documentation on choosing a shard key: https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly distinguishes between hashed shard keys (for even distribution) and ranged compound shard keys (for range query efficiency). All code examples use valid MongoDB shell syntax.
- The `explain()` output description is accurate: `SINGLE_SHARD` indicates a targeted query and `SHARD_MERGE` indicates scatter-gather, as seen in the `queryPlanner.winningPlan.stage` field of sharded explain output.
- The scaling claim that "targeted queries scale linearly with cluster size" refers to aggregate throughput, not individual query latency, which is a standard and accepted way to describe this behavior.
- Starting with MongoDB 6.0, `sh.shardCollection()` remains valid but `sh.shardCollection()` is an alias for `adminCommand({ shardCollection: ... })`. The syntax used in the post is correct and portable across versions.
- The common mistakes section covers the most critical shard key anti-patterns. One additional pattern worth mentioning in a future update could be the challenge of changing shard keys after initial selection (resharding was introduced in MongoDB 5.0 but is still an expensive operation).
