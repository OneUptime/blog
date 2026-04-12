# How to Use Ranged Shard Keys in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Shard Key, Database, Scalability

Description: Learn how to use ranged shard keys in MongoDB for efficient range queries and targeted writes, including hotspot prevention and compound key strategies.

---

Ranged sharding assigns documents to chunks based on contiguous ranges of the shard key value. Documents with adjacent shard key values end up on the same shard or adjacent chunks, enabling efficient range queries. The main risk is write hotspots when the shard key is monotonically increasing.

## How Ranged Sharding Works

MongoDB divides the shard key space into contiguous ranges:

```text
Chunk 1: customerId < "C200"       -> shard1
Chunk 2: "C200" <= customerId < "C500" -> shard2
Chunk 3: customerId >= "C500"      -> shard3
```

A query for `customerId: { $gte: "C200", $lte: "C400" }` targets only shard2.

## Setting Up Ranged Sharding

### Step 1 - Create an Index on the Shard Key

```javascript
db.orders.createIndex({ customerId: 1 })
```

### Step 2 - Shard the Collection

```javascript
sh.shardCollection("myapp.orders", { customerId: 1 })
```

This is identical to hashed except the key value is `1` (ascending) instead of `"hashed"`.

## Choosing a Good Ranged Shard Key

A ranged shard key should have:

- **High cardinality** - avoid low-cardinality fields like boolean or small enums
- **Non-monotonic values** - avoid timestamps or auto-increment IDs as standalone keys
- **Query alignment** - fields most commonly used in range filters

## Avoiding Hotspots

The classic hotspot problem: if you shard by `createdAt` (a timestamp), all new inserts go to the shard holding the latest chunk - a "write hotspot":

```text
Chunk: { createdAt: ISODate("2026-01-01") } -> shard3 (all new writes)
```

Solutions:

**Use a compound key with a high-cardinality prefix:**

```javascript
sh.shardCollection("myapp.orders", { customerId: 1, createdAt: 1 })
```

Inserts spread across shards because `customerId` has high cardinality.

**Add a random bucket prefix** to distribute monotonic traffic:

```javascript
// Add a random bucket prefix to the key
{ bucket: Math.floor(Math.random() * 10), timestamp: new Date() }
sh.shardCollection("myapp.events", { bucket: 1, timestamp: 1 })
```

## Pre-Splitting Chunks

For empty collections about to receive a large import:

```javascript
// Split at known key boundaries
for (let i = 1000; i <= 9000; i += 1000) {
  sh.splitAt("myapp.orders", { customerId: "C" + i })
}
```

Then manually move chunks to distribute evenly before importing.

## Verifying Range Distribution

```javascript
const collDoc = db.getSiblingDB("config").collections.findOne({ _id: "myapp.orders" })
db.getSiblingDB("config").chunks.find({ uuid: collDoc.uuid }).sort({ min: 1 }).forEach(c => {
  printjson({ shard: c.shard, min: c.min, max: c.max })
})
```

## Targeted vs Scatter-Gather Queries

```javascript
// Targeted - includes shard key in filter
db.orders.find({ customerId: "C500", status: "shipped" })
// EXPLAIN shows: SHARD_MERGE with 1 shard

// Scatter-gather - missing shard key
db.orders.find({ status: "pending" })
// EXPLAIN shows: SHARD_MERGE with all shards
```

Use `explain()` to confirm queries are targeted:

```javascript
db.orders.find({ customerId: "C500" }).explain("executionStats")
```

## Summary

Ranged shard keys excel at range queries by ensuring documents with adjacent key values are co-located on the same shard. The key risk is hotspots from monotonically increasing fields; mitigate this with compound keys that include a high-cardinality prefix. Pre-split chunks before large imports and use `explain()` to verify your most common queries are targeting specific shards rather than scatter-gathering across all of them.

