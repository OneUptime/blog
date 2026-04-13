# How to Move a Chunk Manually in MongoDB Sharding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Chunk, Operation, Administration

Description: Learn how to manually move chunks between shards in MongoDB using moveChunk, when manual migration is necessary, and how to verify the move completed.

---

## Introduction

The MongoDB balancer handles chunk distribution automatically, but there are situations where you need to move a chunk manually: pre-splitting a new collection, rebalancing after adding a shard, moving hot chunks off an overloaded shard, or pinning data to a specific shard for compliance reasons.

## When to Move Chunks Manually

- Pre-splitting a freshly sharded collection before data is inserted
- Moving a specific customer's data to a dedicated shard
- Addressing a hot shard caused by uneven key distribution
- Setting up zone sharding after chunks are already distributed

## Step 1: Identify the Chunk to Move

Connect to mongos and find the chunk:

```javascript
use config

// Get the collection UUID (MongoDB 6.0+ uses uuid instead of ns in config.chunks)
var collUUID = db.collections.findOne({ _id: "ecommerce.orders" }).uuid

// Find chunks for the collection
db.chunks.find({ uuid: collUUID }).sort({ min: 1 }).pretty()

// Find the chunk containing a specific shard key value
db.chunks.findOne({
  uuid: collUUID,
  min: { $lte: { customerId: "CUST-5000" } },
  max: { $gt: { customerId: "CUST-5000" } }
})
```

Note the `shard` field (current shard) and the `min`/`max` bounds.

## Step 2: Identify the Target Shard

```javascript
// List available shards
db.adminCommand({ listShards: 1 })
```

## Step 3: Move the Chunk

```javascript
// Move a chunk using a document that falls within the chunk's range
db.adminCommand({
  moveChunk: "ecommerce.orders",
  find: { customerId: "CUST-5000" },
  to: "rs-shard2",
  _waitForDelete: true   // Wait for the delete phase to complete before returning
})
```

Alternatively, specify the exact `bounds` instead of `find`:

```javascript
db.adminCommand({
  moveChunk: "ecommerce.orders",
  bounds: [
    { customerId: "CUST-4000" },
    { customerId: "CUST-6000" }
  ],
  to: "rs-shard2"
})
```

## Step 4: Monitor the Migration

```javascript
// Watch the migration in progress
db.adminCommand({
  currentOp: 1,
  "command.moveChunk": { $exists: true }
})

// Or watch from the config server
use config
db.migrations.find().pretty()
```

## Step 5: Verify the Move

```javascript
use config
var collUUID = db.collections.findOne({ _id: "ecommerce.orders" }).uuid
db.chunks.findOne({
  uuid: collUUID,
  min: { $lte: { customerId: "CUST-5000" } },
  max: { $gt: { customerId: "CUST-5000" } }
})
// The shard field should now show "rs-shard2"
```

Check migration was recorded in changelog:

```javascript
db.changelog.find({
  what: "moveChunk.from",
  ns: "ecommerce.orders"
}).sort({ time: -1 }).limit(3).pretty()
```

## Step 6: Bulk Manual Chunk Moves

For pre-splitting a new collection, move many chunks at once:

```javascript
// Pre-split and distribute across 3 shards
var shards = ["rs-shard1", "rs-shard2", "rs-shard3"]
var splitPoints = ["CUST-1000", "CUST-2000", "CUST-3000", "CUST-4000", "CUST-5000"]

// First, split the initial chunk at each point
splitPoints.forEach(function(point) {
  db.adminCommand({
    split: "ecommerce.orders",
    middle: { customerId: point }
  })
})

// Then distribute chunks round-robin
use config
var collUUID = db.collections.findOne({ _id: "ecommerce.orders" }).uuid
var chunks = db.chunks.find(
  { uuid: collUUID },
  { min: 1, shard: 1 }
).sort({ "min.customerId": 1 }).toArray()

chunks.forEach(function(chunk, i) {
  var targetShard = shards[i % shards.length]
  if (chunk.shard !== targetShard) {
    db.adminCommand({
      moveChunk: "ecommerce.orders",
      find: chunk.min,
      to: targetShard,
      _waitForDelete: true
    })
    print("Moved chunk", JSON.stringify(chunk.min), "to", targetShard)
  }
})
```

## Stopping the Balancer Before Manual Moves

Stop the balancer to prevent it from interfering with your manual moves:

```javascript
sh.stopBalancer(30000)
sh.getBalancerState()  // Confirm: false

// ... perform your manual moves ...

sh.startBalancer()
```

## Troubleshooting Failed Moves

```javascript
// Check for errors in the changelog
use config
db.changelog.find({
  what: "moveChunk.from",
  "details.errmsg": { $exists: true },
  ns: "ecommerce.orders"
}).sort({ time: -1 }).limit(5).forEach(doc => {
  print(doc.time, doc.details.errmsg)
})

// Check for ongoing migrations that may block new ones
db.migrations.find()

// Check if chunk split is needed before move
// Error "chunk too big" means you must split first
db.adminCommand({
  split: "ecommerce.orders",
  find: { customerId: "CUST-5000" }
})
```

## Summary

Manual chunk moves in MongoDB are performed with `db.adminCommand({ moveChunk: ... })`. Use `find` to specify a document within the chunk or `bounds` to specify exact chunk boundaries. Always stop the balancer before doing bulk manual moves to avoid conflicts, and verify each move by querying `config.chunks`. Pre-splitting combined with manual moves is the recommended way to seed a new sharded collection with even distribution before bulk data import.
