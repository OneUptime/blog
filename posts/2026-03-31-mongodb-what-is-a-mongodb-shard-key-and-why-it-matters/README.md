# What Is a MongoDB Shard Key and Why It Matters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Shard Key, Horizontal Scaling, Performance

Description: Learn what a MongoDB shard key is, how it determines data distribution across shards, and how to choose the right shard key for your workload.

---

## What Is a Shard Key

A shard key is the field (or compound of fields) used to distribute documents across shards in a MongoDB sharded cluster. Every document must contain the shard key. MongoDB uses it to determine which shard holds each document.

## How Sharding Works

MongoDB divides the shard key's value space into chunks. Each chunk maps to a specific shard. When a chunk grows too large, MongoDB splits it and migrates chunks between shards to maintain balance.

## Shard Key Strategies

### Hashed Shard Key

Distributes data uniformly using a hash of the shard key value:

```javascript
sh.shardCollection("myapp.events", { userId: "hashed" })
```

Best for: Write-heavy workloads needing uniform distribution. Scatter-gather queries (no range targeting).

### Range Shard Key

Distributes data based on sorted ranges of the shard key:

```javascript
sh.shardCollection("myapp.orders", { createdAt: 1 })
```

Best for: Range queries on the shard key. Risk of monotonic hotspots if key is timestamp or auto-increment.

### Compound Shard Key

Combine multiple fields for more flexibility:

```javascript
sh.shardCollection("myapp.logs", { customerId: 1, timestamp: 1 })
```

Best for: Isolating customer data while enabling time-range queries per customer.

## What Makes a Good Shard Key

1. **High cardinality** - many distinct values to distribute across many chunks
2. **Uniform distribution** - no hotspot values
3. **Query targeting** - most queries include the shard key to avoid scatter-gather
4. **Immutability** - shard key values should not change after insertion (MongoDB 4.2+ allows updates in some cases)

## Bad Shard Key Examples

```javascript
// BAD: Low cardinality - only two values (true/false)
sh.shardCollection("users", { isActive: 1 })

// BAD: Monotonically increasing - all writes go to the same chunk
sh.shardCollection("events", { _id: 1 })  // ObjectId is monotonic

// BAD: Frequently null - all null documents on one shard
sh.shardCollection("orders", { discountCode: 1 })
```

## Checking Chunk Distribution

```javascript
sh.status()

// Check which shard has how many chunks (MongoDB 5.x and earlier)
use config
db.chunks.aggregate([
  { $match: { ns: "myapp.orders" } },
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])

// MongoDB 6.0+: the ns field was replaced by uuid in config.chunks.
// Look up the collection UUID first, then query by it:
const collUUID = db.collections.findOne({ _id: "myapp.orders" }).uuid
db.chunks.aggregate([
  { $match: { uuid: collUUID } },
  { $group: { _id: "$shard", count: { $sum: 1 } } }
])
```

## You Cannot Change the Shard Key

Choose carefully - the shard key cannot be changed once set (before MongoDB 5.0). In MongoDB 5.0+, you can reshard but it is an expensive operation:

```javascript
// MongoDB 5.0+: resharding
db.adminCommand({
  reshardCollection: "myapp.orders",
  key: { customerId: "hashed" }
})
```

## Targeted vs Scatter-Gather Queries

```javascript
// Targeted query (includes shard key) - fast
db.orders.find({ customerId: "c123", orderId: "o456" })

// Scatter-gather (no shard key) - hits all shards
db.orders.find({ status: "pending" })
```

## Summary

The shard key is the most important architectural decision in a MongoDB sharded cluster. It determines how data is distributed, how queries are routed, and where write hotspots form. Choose a key with high cardinality, uniform distribution, and alignment with your most common query patterns.
