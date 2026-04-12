# How to Split Chunks Manually in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Chunk, Administration, Database

Description: Learn how to manually split chunks in a MongoDB sharded cluster using sh.splitAt() and sh.splitFind(), and when manual splitting is necessary.

---

MongoDB's balancer splits and migrates chunks automatically, but there are scenarios where manual chunk splitting is necessary: pre-populating a new sharded collection, resolving jumbo chunks, or accelerating initial distribution after sharding a large existing collection.

## When to Split Chunks Manually

- **Pre-splitting** before a large data import to avoid balancer scrambling
- **Resolving jumbo chunks** that are too large for automatic splitting
- **Accelerating distribution** when the balancer is too slow for your timeline
- **Rebalancing after adding a shard** to speed up chunk migration to the new shard

## sh.splitAt() - Split at a Specific Value

Splits a chunk at a specific shard key value, creating two chunks:

```javascript
// Split the orders collection at customerId "C5000"
sh.splitAt("myapp.orders", { customerId: "C5000" })
```

After this command, there are two chunks:
- Chunk 1: `MinKey -> C5000`
- Chunk 2: `C5000 -> MaxKey`

For compound keys:

```javascript
sh.splitAt("myapp.orders", { customerId: "C5000", createdAt: ISODate("2026-01-01") })
```

## sh.splitFind() - Split Near a Document

`splitFind` finds the midpoint of the chunk containing the matching document and splits there:

```javascript
// Split the chunk containing the document with customerId "C3000"
sh.splitFind("myapp.orders", { customerId: "C3000" })
```

This is useful when you want to split a chunk but do not know the exact midpoint.

## Pre-Splitting a New Collection

Before importing a large dataset, create initial chunks across all shards:

```javascript
// 1. Enable sharding
sh.enableSharding("myapp")
sh.shardCollection("myapp.events", { customerId: 1 })

// 2. Stop the balancer temporarily
sh.stopBalancer()

// 3. Pre-split at anticipated shard key values
var splitPoints = ["C1000", "C2000", "C3000", "C4000", "C5000",
                   "C6000", "C7000", "C8000", "C9000"];

splitPoints.forEach(val => {
  sh.splitAt("myapp.events", { customerId: val });
})

// 4. Move chunks to target shards
sh.moveChunk("myapp.events", { customerId: "C3000" }, "shard2")
sh.moveChunk("myapp.events", { customerId: "C6000" }, "shard3")
sh.moveChunk("myapp.events", { customerId: "C9000" }, "shard4")

// 5. Restart the balancer
sh.startBalancer()
```

## Using the Admin Command Directly

`sh.splitAt()` is a wrapper for the `split` admin command:

```javascript
db.adminCommand({
  split: "myapp.orders",
  middle: { customerId: "C3000" }
})
```

You can also use `find` to let MongoDB choose the split point (equivalent to `sh.splitFind()`), or `bounds` to specify the exact chunk boundaries:

## Verify Chunks After Splitting

```javascript
use config
db.chunks.find({ ns: "myapp.orders" }).sort({ min: 1 })
```

Or count per shard:

```javascript
db.chunks.aggregate([
  { $match: { ns: "myapp.orders" } },
  { $group: { _id: "$shard", chunks: { $sum: 1 } } },
  { $sort: { chunks: -1 } }
])
```

## Splitting Jumbo Chunks

Jumbo chunks cannot be split automatically by the balancer. If the chunk contains multiple distinct shard key values, you can split manually:

```javascript
// Find the jumbo chunk's range
use config
db.chunks.findOne({ ns: "myapp.orders", jumbo: true })

// Split it at a midpoint
sh.splitAt("myapp.orders", { customerId: "C4500" })
```

If the chunk has only a single shard key value, splitting is impossible - you need to refactor the shard key.

## Summary

Manual chunk splitting with `sh.splitAt()` and `sh.splitFind()` is most valuable for pre-splitting before large imports and resolving jumbo chunks. Stop the balancer before manually splitting and moving chunks to avoid conflicts with automatic balancing. After pre-splitting, restart the balancer and verify even distribution with `db.collection.getShardDistribution()`.

