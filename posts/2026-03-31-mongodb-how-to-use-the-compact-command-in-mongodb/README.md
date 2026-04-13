# How to Use the compact Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Storage, Administration, Performance, WiredTiger, Maintenance

Description: Learn how to use the compact command in MongoDB to reclaim disk space and defragment collection storage after large delete or update operations.

---

## Introduction

The `compact` command rewrites and defragments a collection's data and indexes within the storage engine. After large-scale deletes or updates, MongoDB may hold onto unused disk space for reuse internally but not return it to the OS. Running `compact` reclaims that space and can improve read performance by reducing fragmentation.

## When to Use compact

Use `compact` after:
- Deleting a large portion of documents (25% or more)
- Performing bulk updates that significantly change document sizes
- Noticing that `storageSize` in `collStats` is much larger than `size`

## Running compact

```javascript
db.runCommand({ compact: "orders" });
```

The command is synchronous and blocks the collection during execution. On WiredTiger, it runs in the foreground but does not require an exclusive database lock.

## Estimating Space Recovery

Before running `compact`, check the ratio of data size to storage size:

```javascript
const stats = db.orders.stats();
print(`Data size: ${(stats.size / 1048576).toFixed(2)} MB`);
print(`Storage size: ${(stats.storageSize / 1048576).toFixed(2)} MB`);
print(`Fragmentation ratio: ${(stats.storageSize / stats.size).toFixed(2)}`);
```

A ratio above 1.5 suggests notable fragmentation.

## Running compact on a Replica Set

On a replica set, run `compact` on secondaries first to minimize impact, then step down the primary and compact it:

```bash
# Connect to each secondary and run compact
mongosh --host secondary1:27017 --eval 'db.runCommand({ compact: "orders" })'
mongosh --host secondary2:27017 --eval 'db.runCommand({ compact: "orders" })'

# Step down the primary and compact it
mongosh --host primary:27017 --eval 'rs.stepDown()'
mongosh --host <new-secondary>:27017 --eval 'db.runCommand({ compact: "orders" })'
```

## Verifying Results

After compaction, compare storage stats:

```javascript
const after = db.orders.stats();
print(`After compact - Storage size: ${(after.storageSize / 1048576).toFixed(2)} MB`);
```

## Alternatives to compact

For continuous space reclamation, consider:

- Using `autoCompact` (available in MongoDB 8.0+) for automatic background compaction
- Using TTL indexes to automatically expire old documents and prevent unbounded growth
- Rebuilding collections via `mongodump` and `mongorestore` for extreme cases

## Summary

The `compact` command is the primary tool for reclaiming disk space and reducing fragmentation in MongoDB collections. It is most useful after large-scale deletes or updates where storage size has grown disproportionately to actual data. On replica sets, compact secondaries first and then the primary to maintain availability throughout the process.
