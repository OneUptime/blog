# How to Shard a Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Scalability, Database, Administration

Description: Learn how to shard a MongoDB collection by choosing a shard key, enabling sharding on the database, and running sh.shardCollection() with ranged and hashed keys.

---

Sharding a collection distributes its data across multiple shards for horizontal scalability. Once a collection is sharded, MongoDB automatically balances chunks across shards as data grows. This guide walks through the full process.

## Prerequisites

- A running sharded cluster (mongos, config servers, and at least 2 shards)
- Connected to `mongos`, not a shard directly
- Sharding enabled on the target database

## Step 1 - Enable Sharding on the Database

> **Note:** Starting in MongoDB 6.0, `sh.enableSharding()` is no longer required. The database is automatically enabled for sharding when you shard its first collection. The command still works but is a no-op.

```javascript
sh.enableSharding("myapp")
```

This does not move any data; it just marks the database as shardable.

## Step 2 - Create an Index on the Shard Key (if it does not exist)

MongoDB requires an index that starts with the shard key field(s) before sharding a non-empty collection. For an empty collection, `sh.shardCollection()` creates the supporting index automatically for both ranged and hashed keys. For a non-empty collection, create the index first:

```javascript
// Ranged shard key index
db.orders.createIndex({ customerId: 1 })

// Hashed shard key index
db.events.createIndex({ _id: "hashed" })
```

## Step 3 - Shard the Collection

### Ranged Sharding

```javascript
sh.shardCollection("myapp.orders", { customerId: 1 })
```

Ranged sharding puts documents with adjacent `customerId` values on the same chunk, making range queries efficient but potentially causing hotspots if customers create orders in bursts.

### Hashed Sharding

```javascript
sh.shardCollection("myapp.events", { _id: "hashed" })
```

Hashed sharding distributes documents evenly but does not support range queries on the shard key.

### Compound Shard Key

```javascript
sh.shardCollection("myapp.products", { category: 1, productId: 1 })
```

Compound keys combine the benefits of cardinality and query routing.

## Step 4 - Verify Sharding Status

```javascript
sh.status()
```

Look for the sharded collection in the output:

```text
--- Sharding Status ---
databases:
  {  "_id" : "myapp",  "primary" : "shard1",  "partitioned" : true }
    myapp.orders
        shard key: { "customerId" : 1 }
        chunks:
            shard1   2
            shard2   2
        ...
```

## Step 5 - Check Collection Distribution

```javascript
db.orders.getShardDistribution()
```

Output shows the number of documents and data size per shard.

## Pre-Splitting Chunks for Large Imports

If you are about to import a large dataset, pre-split chunks to avoid the balancer scrambling to distribute data after insertion:

```javascript
// Pre-split at specific key values
sh.splitAt("myapp.orders", { customerId: "C1000" })
sh.splitAt("myapp.orders", { customerId: "C2000" })
sh.splitAt("myapp.orders", { customerId: "C3000" })

// Move chunks to specific shards
sh.moveChunk("myapp.orders", { customerId: "C1000" }, "shard1")
sh.moveChunk("myapp.orders", { customerId: "C2000" }, "shard2")
```

## Choosing the Right Shard Key

A good shard key has:

- **High cardinality** - enough distinct values to create many chunks
- **Low frequency** - no single value dominates (no hotspot)
- **Non-monotonic growth** - avoid timestamp or auto-increment fields as standalone keys
- **Query alignment** - commonly filtered fields should be included

## Querying a Sharded Collection

```javascript
// Targeted query (uses shard key, goes to one shard)
db.orders.find({ customerId: "C500" })

// Scatter-gather query (no shard key, goes to all shards)
db.orders.find({ status: "pending" })
```

Targeted queries are significantly faster than scatter-gather. Design your shard key to match your most common query patterns.

## Summary

Sharding a MongoDB collection requires enabling sharding on the database, ensuring an index exists on the shard key, and running `sh.shardCollection()`. Choose between ranged and hashed sharding based on your query patterns and write distribution needs. Use `sh.status()` and `db.collection.getShardDistribution()` to monitor chunk placement after sharding.

