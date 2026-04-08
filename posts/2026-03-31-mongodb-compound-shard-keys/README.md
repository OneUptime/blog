# How to Use Compound Shard Keys in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sharding, Shard Key, Database, Performance

Description: Learn how to design and use compound shard keys in MongoDB to balance write distribution, support range queries, and avoid hotspots in sharded collections.

---

A compound shard key uses two or more fields to determine chunk placement. This gives you more control than a single-field key: you can combine a hashed field for distribution with a ranged field for query efficiency, or use multiple ranged fields for locality.

## Why Use Compound Shard Keys?

- A single high-cardinality field may still produce hotspots (e.g., userId with bulk inserts from one user)
- Compound keys let you support queries on multiple fields with targeted routing
- You can combine a zone prefix with a time-based field for data locality + range queries

## Compound Key Patterns

### 1. Two Ranged Fields

Best for queries that filter on both fields:

```javascript
db.orders.createIndex({ customerId: 1, createdAt: 1 })
sh.shardCollection("myapp.orders", { customerId: 1, createdAt: 1 })
```

Queries like `{ customerId: "C500", createdAt: { $gte: ... } }` are fully targeted.

### 2. Hashed Prefix + Ranged Suffix

Distributes writes evenly while supporting range queries on the second field:

```javascript
db.events.createIndex({ userId: "hashed", ts: 1 })
sh.shardCollection("myapp.events", { userId: "hashed", ts: 1 })
```

Inserts are evenly distributed because `userId` is hashed. Queries filtering by `userId` + `ts` range are targeted to one shard.

### 3. Zone Tag Prefix

Enables zone sharding with range queries:

```javascript
db.users.createIndex({ region: 1, _id: 1 })
sh.shardCollection("myapp.users", { region: 1, _id: 1 })
```

Zone ranges are defined on `region`, and `_id` provides cardinality within each zone.

## Creating the Index Before Sharding

For collections with existing data, the index must exist before sharding:

```javascript
// For existing collections
db.orders.createIndex({ customerId: 1, createdAt: 1 })
sh.shardCollection("myapp.orders", { customerId: 1, createdAt: 1 })

// For empty collections, MongoDB creates the index automatically
sh.shardCollection("myapp.new_orders", { customerId: 1, createdAt: 1 })
```

## Query Targeting Rules

A query is targeted if it includes the **prefix** of the shard key:

```javascript
// Targeted - includes full shard key prefix
db.orders.find({ customerId: "C500" })
db.orders.find({ customerId: "C500", createdAt: { $gte: ISODate("2026-01-01") } })

// Scatter-gather - missing shard key
db.orders.find({ createdAt: { $gte: ISODate("2026-01-01") } })
```

Only the prefix matters: if your key is `{ a: 1, b: 1, c: 1 }`, then `{ a }`, `{ a, b }`, and `{ a, b, c }` are all targeted. `{ b }` alone is not.

## Verify Query Targeting

```javascript
db.orders.find({ customerId: "C500" }).explain("executionStats")
```

Look for `SINGLE_SHARD` in the query plan stage for a targeted query. If you see `SHARD_MERGE`, the query hit multiple shards.

## Compound Key with Hashed Field

A compound shard key can include only **one** hashed field. Starting with MongoDB 4.4, the hashed field can appear at any position in the key:

```javascript
// Valid - hashed field first
{ userId: "hashed", ts: 1 }

// Valid (MongoDB 4.4+) - hashed field in non-first position
{ ts: 1, userId: "hashed" }

// NOT valid - only one field can be hashed
{ userId: "hashed", orgId: "hashed" }
```

## Choosing Compound Key Field Order

1. Fields used most in equality filters come first
2. High-cardinality fields before low-cardinality fields
3. Fields used in range queries come last

## Summary

Compound shard keys give you fine-grained control over data distribution and query targeting. A hashed prefix with a ranged suffix is ideal for high-insert workloads that also need efficient per-user range queries. Always include the shard key prefix in your most common queries to ensure targeted routing. Verify targeting with `explain()` and design the key field order to match your most frequent query patterns.

