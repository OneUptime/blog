# How to Enable Sharding on a MongoDB Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Scalability, Operation, Cluster

Description: Enable sharding on a MongoDB database and collection to distribute data across multiple shards for horizontal scalability.

---

## Prerequisites

Before enabling sharding on a database, you need a running sharded cluster with:
- At least one shard (a replica set)
- Config server replica set (`mongos` config)
- `mongos` query router

## Connect to the mongos Router

All sharding configuration commands run against `mongos`, not directly against shards.

```bash
mongosh --host mongos-host --port 27017
```

## Enable Sharding on a Database

Use `sh.enableSharding()` to enable sharding on the target database:

```javascript
sh.enableSharding("myDatabase");
```

This marks the database as sharding-enabled but does not shard any collections yet. Existing collections remain on the primary shard until you shard them explicitly.

> **Note:** Starting in MongoDB 6.0, calling `sh.enableSharding()` is no longer required. Sharding is automatically enabled on a database when you shard its first collection with `sh.shardCollection()`.

## Shard a Collection with a Shard Key

Choose a shard key and shard the collection:

```javascript
// Hashed shard key - good for even distribution of high-cardinality keys
sh.shardCollection("myDatabase.events", { userId: "hashed" });

// Range-based shard key - good for range queries
sh.shardCollection("myDatabase.orders", { customerId: 1, orderDate: 1 });
```

## Create an Index on the Shard Key First

MongoDB requires an index on the shard key before sharding. For a collection that already has data:

```javascript
use myDatabase
db.orders.createIndex({ customerId: 1, orderDate: 1 });

// Then shard from mongos
sh.shardCollection("myDatabase.orders", { customerId: 1, orderDate: 1 });
```

For new empty collections, `shardCollection` creates the index automatically.

## Verify Sharding Is Enabled

Check the sharding status of the cluster and specific databases:

```javascript
sh.status()
```

This shows:
- Which databases have sharding enabled
- Which collections are sharded and their shard key
- Chunk distribution across shards

Filter for a specific database:

```javascript
db.adminCommand({ listDatabases: 1 }).databases.filter(
  d => d.name === "myDatabase"
)
```

## Check Chunk Distribution

After inserting data, chunks should distribute across shards:

```javascript
use myDatabase
db.events.getShardDistribution()
```

## Summary

Enabling sharding on a MongoDB database requires a running sharded cluster. On MongoDB versions before 6.0, call `sh.enableSharding("dbName")` to mark the database, then `sh.shardCollection()` on each collection you want to distribute. On MongoDB 6.0 and later, you can call `sh.shardCollection()` directly. Choose your shard key carefully - it determines how data distributes and cannot be easily changed after sharding.
