# How to Use Hashed Shard Keys in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Shard Key, Database, Scalability

Description: Learn when and how to use hashed shard keys in MongoDB for even data distribution, including setup, limitations, and comparison with ranged sharding.

---

Hashed shard keys distribute documents by hashing the shard key field value, producing a near-uniform distribution across shards. This eliminates hotspots caused by sequential inserts but at the cost of efficient range queries on the shard key.

## When to Use Hashed Sharding

- Insert-heavy workloads with monotonically increasing keys (e.g., timestamps, auto-increment IDs)
- Collections where you always query by exact match, never by range on the shard key
- Situations where even data distribution is more important than shard-targeted range queries

## How Hashed Sharding Works

MongoDB computes a hash of the shard key value, producing a 64-bit integer, and uses that hash to determine chunk placement. Documents with adjacent shard key values end up on different shards:

```text
customerId "C001" -> hash(C001) -> shard2
customerId "C002" -> hash(C002) -> shard1
customerId "C003" -> hash(C003) -> shard3
```

## Setting Up Hashed Sharding

### Step 1 - Enable Sharding on the Database

> **Note:** Starting in MongoDB 6.0, `sh.enableSharding()` is no longer required. The database is automatically enabled for sharding when you shard the first collection. You can skip this step on MongoDB 6.0+.

```javascript
sh.enableSharding("myapp")
```

### Step 2 - Shard the Collection with a Hashed Key

```javascript
sh.shardCollection("myapp.events", { _id: "hashed" })
```

MongoDB automatically creates a hashed index on `_id` if one does not exist.

To hash a different field:

```javascript
sh.shardCollection("myapp.users", { userId: "hashed" })
```

First create the index manually if the collection has existing data:

```javascript
db.users.createIndex({ userId: "hashed" })
sh.shardCollection("myapp.users", { userId: "hashed" })
```

## Pre-Splitting with Hashed Keys

For empty collections being pre-filled with large datasets, MongoDB automatically creates initial chunks distributed across all shards when using a hashed shard key. On MongoDB versions prior to 7.2, you could control this with `numInitialChunks`:

```javascript
// MongoDB < 7.2 only — numInitialChunks was removed in 7.2
sh.shardCollection("myapp.logs", { _id: "hashed" }, false, { numInitialChunks: 8 })
```

On MongoDB 7.2+, initial chunk creation for hashed shard keys is automatic and does not require this parameter.

## Verify Distribution

```javascript
db.events.getShardDistribution()
```

Good output shows roughly equal document counts per shard:

```text
Shard shard1 at shard1/mongo-s1:27017
 data : 98.5MiB docs : 520000 chunks : 4
Shard shard2 at shard2/mongo-s2:27017
 data : 99.1MiB docs : 524000 chunks : 4
```

## Limitations of Hashed Sharding

**No range query optimization:**

```javascript
// This is a scatter-gather query (hits all shards)
db.events.find({ _id: { $gt: ObjectId("..."), $lt: ObjectId("...") } })
```

With a hashed `_id`, the range on the original value does not map to a range on the hash, so MongoDB cannot target a specific shard.

**No sort optimization on shard key:**

```javascript
// Cannot use the shard key for sort targeting with hashed keys
db.events.find().sort({ _id: 1 })
```

**Compound hashed keys (one hashed field only):**

Starting in MongoDB 4.4, compound hashed shard keys are supported. The hashed field can be at any position, but only one field can be hashed:

```javascript
// Valid: compound key with hashed prefix
sh.shardCollection("myapp.logs", { ts: "hashed", level: 1 })

// Also valid: hashed field at the end (MongoDB 4.4+)
sh.shardCollection("myapp.logs", { level: 1, ts: "hashed" })
```

## Hashed vs Ranged Sharding Comparison

| Criteria | Hashed | Ranged |
|---|---|---|
| Data distribution | Uniform | Can be uneven |
| Insert hotspots | No | Yes (with monotonic keys) |
| Range query efficiency | No (scatter-gather) | Yes (targeted) |
| Best for | Write-heavy, monotonic keys | Range queries, geographic locality |

## Summary

Hashed shard keys provide uniform data distribution and eliminate insert hotspots caused by monotonically increasing fields like timestamps and ObjectIds. Use `numInitialChunks` when pre-populating large collections to avoid initial balancer thrash. The key trade-off is that range queries on the shard key become scatter-gather operations, so hashed sharding is best for workloads that query by exact key match rather than by range.

