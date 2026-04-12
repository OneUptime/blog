# How to Migrate an Unsharded Collection to a Sharded Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Migration, Database, Scalability

Description: Learn how to migrate an existing unsharded MongoDB collection to a sharded collection with minimal downtime, including index creation and balancer monitoring.

---

As a MongoDB collection grows, you may need to shard it for horizontal scalability. Unlike starting fresh, migrating an existing collection requires careful shard key selection, index creation on live data, and monitoring the initial chunk distribution.

## Prerequisites

- A running MongoDB sharded cluster (mongos + config servers + at least 2 shards)
- Connected to `mongos`
- Write access to the collection

## Step 1 - Choose a Shard Key

This is the most important decision. A poor shard key causes hotspots or scatter-gather queries. While MongoDB 5.0+ allows changing the shard key with `reshardCollection`, it is a heavyweight operation, so choose carefully. Consider:

- **Cardinality** - many distinct values
- **Query patterns** - fields in frequent equality or range filters
- **Write distribution** - avoid monotonically increasing keys without a prefix

For example, for an `orders` collection frequently queried by `customerId`:

```javascript
{ customerId: 1 }
// or for even distribution:
{ customerId: "hashed" }
```

## Step 2 - Create the Shard Key Index

For an existing collection with data, you must create the index first:

```javascript
db.orders.createIndex({ customerId: 1 })
```

In MongoDB 4.2+, index builds use an optimized process that is largely non-blocking (exclusive lock held only briefly at start and end). Monitor progress:

```javascript
db.adminCommand({ currentOp: 1, $all: true, "command.createIndexes": "orders" })
```

Wait for the index build to complete before proceeding.

## Step 3 - Enable Sharding on the Database

Starting in MongoDB 6.0, this step is no longer required - the database is automatically enabled for sharding when you shard its first collection. For MongoDB versions prior to 6.0:

```javascript
sh.enableSharding("myapp")
```

## Step 4 - Shard the Collection

```javascript
sh.shardCollection("myapp.orders", { customerId: 1 })
```

This command does not move any data immediately. It creates an initial chunk and marks the collection as sharded.

## Step 5 - Monitor Initial Chunk Distribution

After sharding, MongoDB starts with a single chunk on the primary shard. The balancer will begin splitting and migrating chunks:

```javascript
sh.status()
```

Check chunk counts per shard over time (MongoDB 5.0+ replaced the `ns` field with `uuid` in `config.chunks`):

```javascript
use config
const coll = db.collections.findOne({ _id: "myapp.orders" })
db.chunks.aggregate([
  { $match: { uuid: coll.uuid } },
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])
```

For large collections, the initial distribution may take hours.

## Step 6 - Pre-Split Chunks (Optional)

If you know the key value distribution in advance, pre-split to speed up initial distribution:

```javascript
// Split at evenly distributed key values
sh.splitAt("myapp.orders", { customerId: "C2500" })
sh.splitAt("myapp.orders", { customerId: "C5000" })
sh.splitAt("myapp.orders", { customerId: "C7500" })

// Manually move chunks to target shards
sh.moveChunk("myapp.orders", { customerId: "C2500" }, "shard2")
sh.moveChunk("myapp.orders", { customerId: "C5000" }, "shard3")
```

## Step 7 - Verify Distribution

```javascript
db.orders.getShardDistribution()
```

Aim for roughly equal data and document counts across shards.

## Step 8 - Update Application Connection String

Ensure your application connects through `mongos`, not directly to shard nodes:

```text
mongodb://mongos1:27017,mongos2:27017/myapp
```

Do not include the `replicaSet` parameter when connecting to `mongos` routers, as they are not a replica set.

## Step 9 - Drop the Original Index (if superseded)

After sharding, the index supporting the shard key is required and cannot be dropped. But if you created extra indexes during the migration, clean them up:

```javascript
db.orders.getIndexes()
```

## Common Issues

**Scatter-gather after migration:**
Your application's queries do not include the shard key. Add the shard key to your query filters or projections.

**Slow initial balancing:**
The balancer window may be limited. Check `config.settings` for `activeWindow` constraints.

## Summary

Migrating an unsharded collection to a sharded one involves selecting a shard key, building the index on live data, enabling database sharding, and running `sh.shardCollection()`. The data does not move immediately - the balancer distributes chunks gradually. Pre-split chunks to accelerate initial distribution for large collections, and always verify targeted query routing after migration.

