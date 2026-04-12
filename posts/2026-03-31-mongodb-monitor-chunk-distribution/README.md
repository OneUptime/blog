# How to Monitor Chunk Distribution in a Sharded MongoDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Monitoring, Chunk, Database

Description: Learn how to monitor and analyze chunk distribution across shards in MongoDB using sh.status(), getShardDistribution(), and config database queries.

---

Chunk distribution determines how evenly data is spread across shards. Uneven distribution leads to hotspots and underutilized shards. MongoDB's balancer normally handles redistribution automatically, but monitoring chunk distribution helps you identify problems before they impact performance.

## Quick Overview with sh.status()

```javascript
sh.status()
```

This provides a summary of chunk counts per shard for every sharded collection:

```text
myapp.orders
    shard key: { "customerId" : 1 }
    chunks:
        shard1   12
        shard2   11
        shard3   13
    { "customerId" : { "$minKey" : 1 } } -->> { "customerId" : "C200" } on : shard1
    { "customerId" : "C200" } -->> { "customerId" : "C500" } on : shard2
    ...
```

## Collection-Level Distribution with getShardDistribution()

```javascript
db.orders.getShardDistribution()
```

Output:

```text
Shard shard1 at shard1/mongo-s1:27017
 estimated data per chunk : 12.3MiB
 data : 148MiB docs : 78000 chunks : 12

Shard shard2 at shard2/mongo-s2:27017
 estimated data per chunk : 11.9MiB
 data : 131MiB docs : 69000 chunks : 11

Totals
 data : 279MiB docs : 147000 chunks : 23
 Shard shard1 contains 53.05% data, 53.06% docs in cluster
 Shard shard2 contains 46.95% data, 46.94% docs in cluster
```

Ideally, each shard holds roughly equal percentages.

## Querying the Config Database Directly

```javascript
use config

// Get the collection UUID first
const collUUID = db.collections.findOne({ _id: "myapp.orders" }).uuid

// Count chunks per shard for a specific collection
db.chunks.aggregate([
  { $match: { uuid: collUUID } },
  { $group: { _id: "$shard", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## List All Chunks for a Collection

```javascript
use config
const collUUID = db.collections.findOne({ _id: "myapp.orders" }).uuid
db.chunks.find({ uuid: collUUID }, { min: 1, max: 1, shard: 1 })
  .sort({ min: 1 })
```

## Find Jumbo Chunks

Jumbo chunks are too large to migrate and block balancing:

```javascript
use config
const collUUID = db.collections.findOne({ _id: "myapp.orders" }).uuid
db.chunks.find({ uuid: collUUID, jumbo: true })
```

A jumbo chunk means either the chunk has too many documents to split or the shard key has low cardinality for that range.

## Monitor Active Balancer Migrations

```javascript
sh.isBalancerRunning()
sh.getBalancerState()

// View recent migrations
use config
db.changelog.find(
  { what: { $in: ["moveChunk.from", "moveChunk.to"] } }
).sort({ time: -1 }).limit(20)
```

## Check Chunk Size Settings

The default chunk size is 128 MB. Smaller sizes mean more chunks and more migrations:

```javascript
use config
db.settings.findOne({ _id: "chunksize" })
// Default: { _id: 'chunksize', value: 128 }
```

To change:

```javascript
db.settings.updateOne(
  { _id: "chunksize" },
  { $set: { value: 64 } },
  { upsert: true }
)
```

## Detect Imbalanced Shards

Imbalance is normal immediately after inserting large amounts of data. The balancer brings it into balance over time. If imbalance persists:

```bash
# Check if balancer is enabled
mongosh --eval 'sh.getBalancerState()'

# Check balancer window
mongosh --eval 'use config; db.settings.findOne({ _id: "balancer" })'
```

## Summary

Monitor chunk distribution using `sh.status()` for a cluster overview and `db.collection.getShardDistribution()` for per-collection detail. Query the `config.chunks` collection for detailed chunk mapping and to detect jumbo chunks. Persistent imbalance usually indicates the balancer is disabled or there are jumbo chunks blocking migrations. Adjust chunk size settings and clear jumbo flags to unblock the balancer.

