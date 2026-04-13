# How to Create a Hashed Index for Hash-Based Sharding in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Hashed Index, Sharding, Horizontal Scaling

Description: Learn how to create hashed indexes in MongoDB for hash-based sharding to achieve even data distribution across shards in a cluster.

---

## Overview

A hashed index in MongoDB computes a hash of the value of a field and indexes the hash. Hashed indexes are primarily used as shard keys to enable hash-based sharding, which distributes documents evenly across shards regardless of the field values. This prevents hotspots that can occur with range-based sharding on monotonically increasing values like timestamps or ObjectIds.

## Creating a Hashed Index

```javascript
// Create a hashed index on the _id field
db.users.createIndex({ _id: "hashed" })

// Create a hashed index on another field
db.events.createIndex({ userId: "hashed" })
```

## Enabling Hash-Based Sharding

To shard a collection using a hashed index as the shard key:

```javascript
// Step 1: Enable sharding on the database
sh.enableSharding("myapp")

// Step 2: Create the hashed index
db.users.createIndex({ _id: "hashed" })

// Step 3: Shard the collection using the hashed shard key
sh.shardCollection("myapp.users", { _id: "hashed" })
```

## Verifying the Hashed Index

```javascript
db.users.getIndexes()
// Returns:
// [
//   { v: 2, key: { _id: 1 }, name: "_id_" },
//   { v: 2, key: { _id: "hashed" }, name: "_id_hashed" }
// ]
```

## When to Use Hash-Based Sharding

```text
Hash-based sharding is ideal when:
- Shard key values are monotonically increasing (timestamps, ObjectIds)
- You want uniform distribution across all shards
- Workload is primarily insert-heavy or point lookups
- You want to avoid write hotspots on a single shard

Range-based sharding is better when:
- Queries frequently access ranges of shard key values
- You need zone sharding for data locality
- Range scans on the shard key are common
```

## Hashed vs Range Index Behavior

```javascript
// With range index: sequential ObjectIds cluster on same shard
// { _id: "2024-01" documents } -> Shard 1
// { _id: "2024-02" documents } -> Shard 1 (hotspot)

// With hashed index: ObjectIds are distributed uniformly
// Hash(ObjectId1) -> Shard 2
// Hash(ObjectId2) -> Shard 1
// Hash(ObjectId3) -> Shard 3
```

## Compound Hashed Indexes (MongoDB 4.4+)

Starting in MongoDB 4.4, you can create a compound index with a hashed field, but only one field can be hashed:

```javascript
// Valid: hashed field plus range field
db.events.createIndex({ tenantId: 1, timestamp: "hashed" })
db.events.createIndex({ timestamp: "hashed", region: 1 })

// Invalid: two hashed fields
// db.events.createIndex({ userId: "hashed", sessionId: "hashed" })
```

## Practical Example - Sharding a High-Volume Events Collection

```javascript
// Events collection with high insert rate using ObjectId _id
// ObjectIds are monotonically increasing, which would cause hotspots

// Solution: hash-shard on _id
sh.enableSharding("analytics")

db.getSiblingDB("analytics").events.createIndex({ _id: "hashed" })

sh.shardCollection("analytics.events", { _id: "hashed" })

// Check shard distribution
db.getSiblingDB("analytics").events.getShardDistribution()
```

## Query Behavior with Hashed Indexes

```javascript
// Point query (equality) - efficient, targets specific shard
db.users.find({ _id: ObjectId("...") })

// Range query - inefficient with hashed shard key, scatters to all shards
db.users.find({ createdAt: { $gte: ISODate("2024-01-01") } })
// For range queries, consider a compound shard key with range on the range field
```

## Limitations of Hashed Indexes

```text
- Cannot use hashed indexes for range queries (hashing destroys ordering)
- Hashed indexes cannot be multikey (cannot hash array fields)
- Hashed indexes do not support unique constraints
- Floating point numbers are truncated to int64 before hashing
  (1.0, 1.5, 1.9 all hash to the same value as 1)
- Only one field can be hashed in a compound index
```

## Checking Shard Balance

```javascript
// After sharding, verify balanced distribution
sh.status()
// Look for even chunk distribution across shards

// Or check per-collection
db.getSiblingDB("myapp").runCommand({ collStats: "users" })
```

## Summary

Hashed indexes compute a hash of a field's value for indexing, making them the foundation of hash-based sharding in MongoDB. They prevent write hotspots caused by monotonically increasing values like ObjectIds and timestamps by uniformly distributing documents across all shards. Use `{ field: "hashed" }` to create the index, then shard the collection with that field as the shard key. Hashed indexes sacrifice range query efficiency for uniform write distribution.
