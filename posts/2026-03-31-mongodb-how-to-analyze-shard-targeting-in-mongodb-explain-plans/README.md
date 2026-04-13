# How to Analyze Shard Targeting in MongoDB Explain Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Explain Plan, Performance, Query Optimization

Description: Learn how to analyze shard targeting in MongoDB explain plans to detect scatter-gather queries, reduce cross-shard overhead, and improve sharded cluster performance.

---

## Why Shard Targeting Matters

In a sharded MongoDB cluster, query performance depends heavily on whether MongoDB can route queries to specific shards (targeted) or must broadcast to all shards (scatter-gather). Scatter-gather queries multiply execution time and resource usage by the number of shards.

## Getting Shard-Aware Explain Output

```javascript
// Connect to mongos (not directly to a shard)
db.orders.explain("executionStats").find({ customerId: "cust-123" });

// For aggregation
db.orders.explain("executionStats").aggregate([
  { $match: { customerId: "cust-123" } }
]);
```

## Sharded Explain Output Structure

The explain output for a sharded cluster wraps each shard's plan:

```javascript
{
  "queryPlanner": {
    "mongosPlannerVersion": 1,
    "winningPlan": {
      "stage": "SHARD_MERGE",       // mongos merges results
      "shards": [
        {
          "shardName": "shard01",
          "connectionString": "shard01/10.0.1.10:27017",
          "serverInfo": { ... },
          "winningPlan": {
            "stage": "SHARDING_FILTER",
            "inputStage": {
              "stage": "FETCH",
              "inputStage": {
                "stage": "IXSCAN",
                "indexName": "customerId_1"
              }
            }
          },
          "rejectedPlans": []
        }
      ]
    }
  }
}
```

## Identifying Scatter-Gather vs Targeted Queries

### Targeted Query (Good)

Only one or a few shards appear in the `shards` array. A single-shard targeted query uses the `SINGLE_SHARD` stage:

```javascript
{
  "winningPlan": {
    "stage": "SINGLE_SHARD",
    "shards": [
      { "shardName": "shard01" }  // only 1 shard queried
    ]
  }
}
```

When a query targets multiple (but not all) shards, the stage is `SHARD_MERGE` with a subset of shards listed.

### Scatter-Gather Query (Bad)

All shards appear - MongoDB broadcasted to every shard:

```javascript
{
  "winningPlan": {
    "stage": "SHARD_MERGE",
    "shards": [
      { "shardName": "shard01" },  // all shards queried
      { "shardName": "shard02" },
      { "shardName": "shard03" },
      { "shardName": "shard04" }
    ]
  }
}
```

## The SHARDING_FILTER Stage

```javascript
{
  "stage": "SHARDING_FILTER",
  "chunkSkips": 15,    // documents skipped because they belong to another shard
  "inputStage": { ... }
}
```

A high `chunkSkips` value indicates orphaned documents on this shard - run a balancer check or cleanup.

## executionStats Across Shards

```javascript
{
  "executionStats": {
    "nReturned": 5,
    "executionTimeMillis": 128,
    "shards": [
      {
        "shardName": "shard01",
        "executionSuccess": true,
        "executionStats": {
          "nReturned": 2,
          "executionTimeMillis": 42,
          "totalKeysExamined": 2,
          "totalDocsExamined": 2
        }
      },
      {
        "shardName": "shard02",
        "executionSuccess": true,
        "executionStats": {
          "nReturned": 3,
          "executionTimeMillis": 128,   // shard02 is slower - investigate
          "totalKeysExamined": 3,
          "totalDocsExamined": 3
        }
      }
    ]
  }
}
```

The overall `executionTimeMillis` is the max across all shards, so a slow shard bottlenecks the whole query.

## Why Queries Scatter

```text
1. Filter does not include the shard key
2. Range query on shard key spans multiple chunks
3. $or query where branches route to different shards
4. Sort does not help with shard targeting — the filter must still include the shard key
5. Collection is not sharded (routes to primary shard)
```

## Diagnosing with mongosShard Explain

```javascript
// Check what shards a query will target BEFORE running it
db.orders.explain("queryPlanner").find({ status: "pending" });

// Extract shard count
const result = db.orders.explain("executionStats").find({ status: "pending" });
const shardCount = result.queryPlanner.winningPlan.shards?.length || 1;
const totalShards = db.adminCommand({ listShards: 1 }).shards.length;

if (shardCount === totalShards) {
  print("WARNING: Scatter-gather query hitting all " + totalShards + " shards");
} else {
  print("Targeted query on " + shardCount + " of " + totalShards + " shards");
}
```

## Fixing Scatter-Gather Queries

### Include the shard key in queries

```javascript
// Shard key: { customerId: 1 }
// BEFORE - scatter-gather
db.orders.find({ status: "pending" });

// AFTER - targeted
db.orders.find({ customerId: "cust-123", status: "pending" });
```

### Use compound shard keys to support more query patterns

```javascript
// Better shard key for range queries
sh.shardCollection("mydb.orders", { region: 1, customerId: 1 });

// Now these queries are targeted:
db.orders.find({ region: "west" });
db.orders.find({ region: "west", customerId: "cust-123" });
```

### Use targeted aggregations

```javascript
// Add shard key to $match early in pipeline
db.orders.aggregate([
  { $match: { customerId: "cust-123", status: "pending" } },  // includes shard key
  { $group: { _id: "$status", total: { $sum: "$amount" } } }
]);
```

## Checking Chunk Distribution

```javascript
// Inspect chunk distribution
db.adminCommand({ balancerStatus: 1 });

// Check chunk counts per shard for a namespace (MongoDB 5.0+ uses uuid instead of ns)
use config;
const collUUID = db.collections.findOne({ _id: "mydb.orders" }).uuid;
db.chunks.aggregate([
  { $match: { uuid: collUUID } },
  { $group: { _id: "$shard", chunkCount: { $sum: 1 } } },
  { $sort: { chunkCount: -1 } }
]);
```

Uneven chunk distribution causes hot shards and slow query times.

## Summary

Shard targeting analysis in MongoDB explain plans involves checking the `shards` array in `winningPlan` to determine whether a query is targeted (hitting one or few shards) or scatter-gather (broadcasting to all shards). Scatter-gather queries multiply load across all shards and are often caused by missing the shard key in the query filter. Fix them by always including the shard key in queries, designing compound shard keys that match common query patterns, and monitoring chunk distribution to prevent hot shard bottlenecks.
