# How to Manage Index Builds in MongoDB (Foreground vs Background)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Index Build, Administration, Performance

Description: Learn how MongoDB handles index builds, the differences between foreground and background builds, and how to manage index creation safely in production.

---

Building indexes on large collections can take minutes to hours. Understanding how MongoDB manages index builds helps you avoid locking issues and minimize impact on production workloads.

## How Index Builds Work in MongoDB 4.2+

Starting with MongoDB 4.2, the distinction between foreground and background index builds was eliminated. All index builds now use an optimized hybrid approach:

1. Takes an exclusive lock (`X`) at the start to initialize
2. Runs the main scan phase with a less restrictive intent exclusive lock (`IX`), allowing concurrent reads and writes
3. Upgrades to a shared lock (`S`) during the drain phase, blocking writes but allowing reads
4. Takes an exclusive lock (`X`) at the end to finalize and commit the index

This means you no longer need a `background: true` option - it is effectively ignored and the behavior is always "hybrid" (safe for production).

## Creating an Index

```javascript
db.orders.createIndex(
  { customerId: 1, createdAt: -1 },
  { name: "idx_customer_created" }
)
```

On MongoDB 4.2+, this runs without blocking reads or writes for the bulk of its duration.

## Legacy Behavior (MongoDB 4.0 and Earlier)

In older versions:

- **Foreground build** (default) - held an exclusive write lock for the entire duration, blocking all reads and writes
- **Background build** - non-blocking but slower and could create a less efficient index

```javascript
// Old syntax - still accepted but behavior changed in 4.2
db.collection.createIndex({ field: 1 }, { background: true })
```

If you are on MongoDB 4.0 or earlier, always use `{ background: true }` for production index builds.

## Monitoring an Active Index Build

Check if an index build is in progress:

```javascript
db.currentOp({ "command.createIndexes": { $exists: true } })
```

Sample output:

```text
{
  "op": "command",
  "ns": "mydb.orders",
  "command": { "createIndexes": "orders", "indexes": [...] },
  "msg": "Index Build: scanning collection",
  "progress": { "done": 4200000, "total": 12500000 },
  "secs_running": 142
}
```

## Terminating an Index Build

If you need to abort an in-progress build, use `dropIndex()` with the index name or specification:

```javascript
// Abort by dropping the in-progress index
db.orders.dropIndex("idx_customer_created")
```

On replica sets, running `dropIndex()` on the primary creates an `abortIndexBuild` oplog entry that propagates to secondaries, stopping their builds as well. Do not use `db.killOp()` to terminate index builds on replica sets or sharded clusters.

## Index Builds on Replica Sets

On a replica set, index builds are coordinated:

1. Primary starts the build
2. Secondaries begin their own builds after replicating the `createIndexes` oplog entry
3. All members complete builds independently but concurrently

To minimize replica set impact, you can use the rolling index build technique - build on each secondary individually (with it removed from the set), then step down the primary and repeat. This avoids having all nodes building simultaneously.

## Index Builds on Sharded Clusters

```javascript
// Run from mongos
db.getSiblingDB("mydb").orders.createIndex({ field: 1 })
```

The `mongos` sends the command to each shard's primary. Builds proceed in parallel across shards.

## Checking Index Build Completion

```javascript
// List indexes to confirm the new index exists
db.orders.getIndexes()

// Or check index details via stats
db.orders.stats({ indexDetails: true }).indexDetails
```

## Summary

MongoDB 4.2+ makes index builds safe for production by default using a hybrid locking strategy that allows concurrent reads and writes during the bulk scan phase. The `background: true` option is a no-op on modern versions. Use `db.currentOp()` to monitor active builds and `db.collection.dropIndex()` to abort them if needed. For zero-impact builds on replica sets, consider the rolling index build approach.
