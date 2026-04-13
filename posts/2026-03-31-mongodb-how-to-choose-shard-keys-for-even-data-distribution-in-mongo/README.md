# How to Choose Shard Keys for Even Data Distribution in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Shard Key, Performance, Scalability

Description: Learn the principles for selecting shard keys that evenly distribute data and query load across MongoDB shards to avoid hotspots and jumbo chunks.

---

## Why the Shard Key Matters

The shard key is the field (or fields) MongoDB uses to partition documents across shards. A poor shard key leads to:
- **Hotspots** - one shard receives the majority of writes
- **Jumbo chunks** - chunks that cannot be split or migrated
- **Uneven storage** - some shards fill up while others remain empty

The ideal shard key produces chunks that are evenly sized and distributes both reads and writes uniformly.

## Key Properties of a Good Shard Key

### High Cardinality

Cardinality refers to the number of distinct values. A boolean field has cardinality 2 and can only ever produce 2 chunks. Use fields with many distinct values:

```text
Good:  userId (millions of unique users)
Bad:   status ("active" | "inactive")
```

### Low Frequency

Frequency measures how often each value appears. If 80% of documents have `region: "us-east"`, 80% of data lands on one shard regardless of cardinality.

### Non-Monotonic Growth

Auto-incrementing values (timestamps, ObjectIDs) insert all new documents into a single chunk at the high end of the range. This creates a write hotspot on the shard holding that chunk.

```text
Bad shard keys for insert-heavy workloads:
  createdAt (monotonically increasing)
  _id (ObjectId - time-based, monotonic)
```

## Strategies for Even Distribution

### Hashed Shard Keys

Hashing the shard key transforms monotonic values into uniformly distributed hash values, eliminating write hotspots:

```javascript
sh.shardCollection("mydb.events", { createdAt: "hashed" });
```

Or on a high-cardinality field:

```javascript
sh.shardCollection("mydb.users", { _id: "hashed" });
```

Hashed sharding provides excellent write distribution but prevents efficient range queries because related values are spread across shards.

### Compound Shard Keys

A compound shard key combining a low-cardinality field with a high-cardinality field gives both geographic locality and distribution:

```javascript
sh.shardCollection("mydb.orders", { region: 1, orderId: 1 });
```

This lets you direct region-specific queries to nearby shards while the high-cardinality `orderId` ensures distribution within each region.

### Zone-Based Keys

If you want data locality (e.g., EU data on EU shards), include a zone field in the shard key and define zones:

```javascript
sh.addShardToZone("shard01", "EU");
sh.addShardToZone("shard02", "US");
sh.updateZoneKeyRange("mydb.users", { region: "EU", _id: MinKey }, { region: "EU", _id: MaxKey }, "EU");
sh.updateZoneKeyRange("mydb.users", { region: "US", _id: MinKey }, { region: "US", _id: MaxKey }, "US");
```

## Evaluating Shard Key Candidates

Check the distribution of values before sharding:

```javascript
// Count distinct values
db.orders.distinct("customerId").length;

// Check frequency distribution
db.orders.aggregate([
  { $group: { _id: "$region", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

A good shard key candidate has:
- Thousands or millions of distinct values (high cardinality)
- No value appearing more than a small percentage of total documents (low frequency)
- Values that do not follow a strict monotonic sequence (non-monotonic)

## Checking Current Chunk Distribution

After sharding, verify balance:

```javascript
sh.status();
```

For more detail:

```javascript
use config;
const coll = db.collections.findOne({ _id: "mydb.orders" });
db.chunks.aggregate([
  { $match: { uuid: coll.uuid } },
  { $group: { _id: "$shard", chunks: { $sum: 1 } } }
]);
```

## Summary

Choosing the right shard key requires balancing cardinality, frequency, and growth patterns. High-cardinality, low-frequency, non-monotonic fields produce even data distribution. When you must shard on a monotonic field like a timestamp, use hashed sharding to spread writes across all shards. Always verify distribution with `sh.status()` after sharding and monitor chunk counts per shard over time.
