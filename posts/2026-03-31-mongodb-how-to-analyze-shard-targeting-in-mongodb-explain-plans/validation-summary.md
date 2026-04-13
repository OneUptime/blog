# Validation Summary: How to Analyze Shard Targeting in MongoDB Explain Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (sharded clusters)
- MongoDB Explain Plans
- mongos query routing
- MongoDB Sharding (shard keys, chunk distribution, SHARDING_FILTER)

## Sources Consulted
- MongoDB Manual: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Manual: Sharded Cluster Query Routing — https://www.mongodb.com/docs/manual/core/sharded-cluster-query-router/
- MongoDB Manual: config.chunks Collection — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.chunks
- MongoDB Manual: sh.shardCollection() — https://www.mongodb.com/docs/manual/reference/method/sh.shardCollection/
- MongoDB Manual: SINGLE_SHARD vs SHARD_MERGE stages — https://www.mongodb.com/docs/manual/reference/explain-results/#sharded-collection

## Issues Found

1. **Targeted query example used wrong stage name**: The "Targeted Query (Good)" example showed `SHARD_MERGE` as the stage for a single-shard targeted query. Since MongoDB 4.4+, a query targeting a single shard uses the `SINGLE_SHARD` stage. `SHARD_MERGE` is used when results from multiple shards are merged. Fixed the example to use `SINGLE_SHARD` and added a note that `SHARD_MERGE` appears when multiple (but not all) shards are targeted.

2. **Misleading claim about sort causing scatter-gather**: Point 4 in "Why Queries Scatter" stated "Sort on non-shard-key field requires collecting from all shards," implying that a sort on a non-shard-key field causes scatter-gather. This is inaccurate — shard targeting is determined by the query filter, not the sort field. A targeted query with a non-shard-key sort still only queries targeted shards (with a merge sort at mongos). Reworded to: "Sort does not help with shard targeting — the filter must still include the shard key."

3. **Chunk distribution query used deprecated `ns` field**: The `config.chunks` aggregation used `{ $match: { ns: "mydb.orders" } }`, which only works on MongoDB 4.4 and earlier. In MongoDB 5.0+, the `config.chunks` collection identifies collections by `uuid` instead of `ns`. Updated the example to first look up the collection UUID from `config.collections`, then query `config.chunks` by `uuid`.

## Review Notes
- The `chunkSkips` field shown in the SHARDING_FILTER example may not appear in all MongoDB versions' explain output. The concept of orphaned document filtering is correct, but readers should verify this field exists in their specific MongoDB version.
- Point 5 in "Why Queries Scatter" states "Collection is not sharded (routes to primary shard)" — this is technically correct but somewhat misleading in a list about scatter-gather causes, since routing to the primary shard is effectively a single-shard targeted operation, not a scatter.
- The section header "Diagnosing with mongosShard Explain" uses the term "mongosShard" which is not an official MongoDB term. This is a naming/editorial issue, not a technical error.
- The `executionStats` structure shown for sharded explain output is a simplified representation. The exact JSON nesting may vary between MongoDB versions.
