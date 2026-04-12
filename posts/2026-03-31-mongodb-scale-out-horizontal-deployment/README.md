# How to Scale Out (Horizontal) a MongoDB Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Scaling, Cluster, Performance

Description: Learn how to horizontally scale a MongoDB deployment by adding shards, enabling sharding on collections, and distributing data across multiple nodes.

---

Horizontal scaling in MongoDB means distributing data across multiple shards - each shard is a replica set that holds a subset of the data. This approach lets you scale beyond the limits of a single server by adding more nodes to the cluster.

## Prerequisites

Horizontal scaling requires a sharded cluster with at least one config server replica set and one or more `mongos` routers. If you are running a standalone or replica set, you need to convert it first.

## Choose a Shard Key and Shard a Collection

Connect to a `mongos` instance. The shard key determines how MongoDB distributes data across shards. Choose a key with high cardinality and an even distribution pattern:

```javascript
// Shard a collection with a hashed shard key
// In MongoDB 6.0+, this automatically enables sharding on the database
sh.shardCollection("myDatabase.orders", { customerId: "hashed" })
```

Hashed shard keys provide uniform distribution. Range-based keys work better for range queries but can create hotspots if data is monotonically increasing.

## Add a New Shard

Provision a new replica set (`shard2`) with three nodes, then add it to the cluster:

```javascript
sh.addShard("shard2/mongo-s2-1:27017,mongo-s2-2:27017,mongo-s2-3:27017")
```

Verify it was added:

```javascript
sh.status()
```

## Monitor the Balancer

MongoDB's balancer automatically migrates chunks from over-loaded shards to the new shard. Monitor migration progress:

```javascript
db.getSiblingDB("config").migrations.countDocuments()
db.getSiblingDB("config").chunks.aggregate([
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])
```

Wait until chunk counts are balanced across shards before running performance tests.

## Control the Balancer Window

Limit balancing to off-peak hours to avoid impacting production workloads:

```javascript
db.getSiblingDB("config").settings.updateOne(
  { _id: "balancer" },
  { $set: { activeWindow: { start: "02:00", stop: "06:00" } } },
  { upsert: true }
)
```

## Add Read Capacity with Secondary Reads

You can also scale reads horizontally by directing queries to secondary nodes in each shard:

```javascript
const client = new MongoClient(uri, {
  readPreference: "secondaryPreferred"
})
```

## Summary

Horizontal scaling in MongoDB uses sharding to distribute data across multiple replica sets. Choose a shard key with high cardinality and even distribution, add new shards to the cluster as needed, and let the balancer migrate chunks automatically. Monitor chunk distribution and balancer activity to ensure data is spread evenly, and consider setting a balancer window to avoid peak-hour disruption.
