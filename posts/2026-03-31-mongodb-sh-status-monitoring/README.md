# How to Monitor MongoDB Sharding with sh.status()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Monitoring, Operation, Administration

Description: Learn how to use sh.status() and related config collection queries to monitor your MongoDB sharded cluster's health, chunk distribution, and balancer state.

---

## Introduction

`sh.status()` is the primary command for getting a snapshot of your MongoDB sharded cluster. It shows all shards, databases, collections, shard keys, and chunk distributions in one output. Understanding how to read and extend this output helps you diagnose balancing issues, hot shards, and misconfigurations.

## Running sh.status()

```javascript
// Connect to mongos
sh.status()

// Verbose output includes all chunk boundaries (useful for smaller clusters)
sh.status(true)
```

## Reading the Output

A typical `sh.status()` output has three sections:

```json
--- Sharding Status ---
sharding version: { "_id" : 1, "minCompatibleVersion" : 5, "currentVersion" : 6 }

shards:
  { "_id" : "rs-shard1", "host" : "rs-shard1/node1:27017,node2:27017", "state" : 1 }
  { "_id" : "rs-shard2", "host" : "rs-shard2/node3:27017,node4:27017", "state" : 1 }

active mongoses:
  "7.0.4" : 2

balancer:
  Currently enabled: yes
  Currently running: no
  Failed balancer rounds in last 5 attempts: 0
  Migration results for the last 24 hours:
    4 : Success

databases:
  { "_id" : "ecommerce", "primary" : "rs-shard1", "partitioned" : true }
    ecommerce.orders
      shard key: { "customerId" : 1 }
      unique: false
      balancing: true
      chunks:
        rs-shard1   5
        rs-shard2   5
      too many chunks to print...
```

## Interpreting Key Fields

```javascript
// Check balancer failures
sh.status()
// Look for: "Failed balancer rounds in last 5 attempts: N"
// N > 0 means the balancer encountered errors - investigate config.changelog
```

## Drilling Into Chunk Distribution

```javascript
use config

// Total chunk count per collection (MongoDB 5.0+ uses uuid instead of ns)
db.chunks.aggregate([
  { $lookup: { from: "collections", localField: "uuid", foreignField: "uuid", as: "coll" } },
  { $unwind: "$coll" },
  { $group: { _id: "$coll._id", total: { $sum: 1 } } },
  { $sort: { total: -1 } }
])

// Distribution per shard per collection
db.chunks.aggregate([
  { $lookup: { from: "collections", localField: "uuid", foreignField: "uuid", as: "coll" } },
  { $unwind: "$coll" },
  {
    $group: {
      _id: { ns: "$coll._id", shard: "$shard" },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.ns": 1, count: -1 } }
])

// Find the collection with the most uneven distribution
db.chunks.aggregate([
  { $lookup: { from: "collections", localField: "uuid", foreignField: "uuid", as: "coll" } },
  { $unwind: "$coll" },
  { $group: { _id: { ns: "$coll._id", shard: "$shard" }, count: { $sum: 1 } } },
  {
    $group: {
      _id: "$_id.ns",
      maxChunks: { $max: "$count" },
      minChunks: { $min: "$count" },
      shardCount: { $sum: 1 }
    }
  },
  { $project: { imbalance: { $subtract: ["$maxChunks", "$minChunks"] } } },
  { $sort: { imbalance: -1 } },
  { $limit: 5 }
])
```

## Checking Shards State

```javascript
// Detailed shard info including tags/zones
use config
db.shards.find().pretty()

// Check if any shard is being drained (removal in progress)
db.shards.find({ draining: true })
```

## Monitoring Mongos Routers

```javascript
use config

// List active mongos instances and versions
db.mongos.find().pretty()

// Check for stale mongos (not pinged recently)
var oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
db.mongos.find({ ping: { $lt: oneHourAgo } })
```

## Checking Collection Sharding Config

```javascript
use config

// View shard key and balancing setting per collection
db.collections.find(
  {},
  { _id: 1, key: 1, noBalance: 1, unique: 1 }
).forEach(c => printjson(c))

// Check which collections have balancing disabled
db.collections.find({ noBalance: true }, { _id: 1 })
```

## Balancer Round History

```javascript
use config

// Last 10 successful migrations
db.changelog.find({
  what: "moveChunk.from"
}).sort({ time: -1 }).limit(10).forEach(doc => {
  print(doc.time.toISOString(), doc.ns, "->", doc.details.to)
})

// Count migrations per collection in last 24 hours
var since = new Date(Date.now() - 86400000)
db.changelog.aggregate([
  { $match: { what: "moveChunk.from", time: { $gte: since } } },
  { $group: { _id: "$ns", migrations: { $sum: 1 } } },
  { $sort: { migrations: -1 } }
])
```

## Scripted Health Check

```javascript
// Run this periodically from a monitoring script
function shardingHealthCheck() {
  var result = {
    balancerEnabled: sh.getBalancerState(),
    balancerRunning: sh.isBalancerRunning(),
    shards: [],
    unevenCollections: []
  }

  // Shard states
  var configDb = db.getSiblingDB('config')
  configDb.shards.find().forEach(s => {
    result.shards.push({ id: s._id, state: s.state, draining: s.draining || false })
  })

  // Collections with imbalance > 10 chunks
  configDb.chunks.aggregate([
    { $lookup: { from: "collections", localField: "uuid", foreignField: "uuid", as: "coll" } },
    { $unwind: "$coll" },
    { $group: { _id: { ns: "$coll._id", shard: "$shard" }, count: { $sum: 1 } } },
    { $group: { _id: "$_id.ns", max: { $max: "$count" }, min: { $min: "$count" } } },
    { $project: { imbalance: { $subtract: ["$max", "$min"] } } },
    { $match: { imbalance: { $gt: 10 } } }
  ]).forEach(c => result.unevenCollections.push(c))

  printjson(result)
}

shardingHealthCheck()
```

## Summary

`sh.status()` provides a top-level view of your MongoDB sharded cluster including shard list, balancer status, and per-collection chunk distribution. For deeper analysis, query `config.chunks`, `config.shards`, `config.collections`, and `config.changelog` directly. Automate a health check script that flags imbalanced collections and balancer failures, and run it regularly as part of your operational monitoring.
