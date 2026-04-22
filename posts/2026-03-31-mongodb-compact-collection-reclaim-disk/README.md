# How to Compact a Collection to Reclaim Disk Space in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compact, Disk, Storage, Performance

Description: Learn how to use the compact command in MongoDB to reclaim fragmented disk space after large deletes or updates, and how to minimize production impact.

---

## Overview

When you delete or update large numbers of documents in MongoDB, the freed storage space is not immediately returned to the operating system. Over time, collections become fragmented. The `compact` command defragments a collection and reclaims unused disk space. Starting in MongoDB 4.4, `compact` returns freed space to the operating system rather than only making it available for reuse within WiredTiger.

## Running the compact Command

Connect to the database and run:

```javascript
db.runCommand({ compact: "orders" })
```

Or use `mongosh`:

```bash
mongosh "mongodb://localhost:27017/mydb" --eval 'db.runCommand({ compact: "orders" })'
```

The command rewrites all documents in the collection, reclaiming fragmented space.

## Checking Collection Size Before and After

Check storage statistics before running `compact` to understand how much space might be reclaimed:

```javascript
db.orders.stats()
```

Key fields to look at:

- `storageSize` - total bytes allocated to the collection on disk
- `size` - total size of all documents in bytes
- The difference between `storageSize` and `size` is the fragmented space

After `compact`, run `stats()` again to confirm the reduction.

## Running compact on a Primary

Starting in MongoDB 4.4, `compact` can run directly on a primary replica set member without any special flags. In earlier versions, you needed to pass `force: true`, but this option was deprecated in 4.4 and removed in 6.0.

```javascript
db.runCommand({ compact: "orders" })
```

Since MongoDB 4.4, `compact` no longer holds a blocking write lock - it yields to allow read and write operations. However, it is still best to run it during low-traffic windows to minimize performance impact.

## Running compact on a Secondary First

A safer approach is to run `compact` on secondaries first, then step down the primary and compact it:

```bash
# Connect to each secondary and run compact
mongosh "mongodb://secondary1:27017/mydb" --eval 'db.runCommand({ compact: "orders" })'
mongosh "mongodb://secondary2:27017/mydb" --eval 'db.runCommand({ compact: "orders" })'

# Step down the primary
mongosh "mongodb://primary:27017/admin" --eval 'rs.stepDown()'

# Compact the new secondary (formerly primary)
mongosh "mongodb://primary:27017/mydb" --eval 'db.runCommand({ compact: "orders" })'
```

## Automating Compaction with a Script

```bash
#!/bin/bash
COLLECTIONS=("orders" "events" "logs")
for coll in "${COLLECTIONS[@]}"; do
  echo "Compacting collection: $coll"
  mongosh "mongodb://localhost:27017/mydb" --eval \
    "db.runCommand({ compact: '$coll' })"
done
echo "All collections compacted"
```

## When to Run compact

- After deleting more than 20-30% of documents in a collection
- After bulk updates that significantly changed document sizes
- When `storageSize` greatly exceeds the actual `size` of documents
- During scheduled maintenance windows

## Summary

The `compact` command in MongoDB defragments a collection and reclaims disk space that was freed by deletes and updates. Since MongoDB 4.4, `compact` no longer blocks reads and writes, but running on secondaries first is still a recommended practice to minimize performance impact. Always check `db.collection.stats()` before and after to confirm the space reclamation was successful.
