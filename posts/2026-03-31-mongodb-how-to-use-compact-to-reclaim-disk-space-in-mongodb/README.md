# How to Use Compact to Reclaim Disk Space in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compact, Disk Space, Storage, Maintenance

Description: Learn how to use MongoDB compact command to defragment collections, reclaim disk space, and rebuild indexes after large delete operations.

---

## Introduction

When you delete or update large numbers of documents in MongoDB, the freed disk space is not automatically returned to the operating system. The WiredTiger storage engine keeps that space available for reuse internally. The `compact` command defragments collections, rewrites data files, and can reclaim disk space by returning unused space to the OS.

## When to Use compact

Run `compact` after:

- Deleting a large percentage of documents from a collection
- Performing bulk updates that significantly reduce document sizes
- Migrating data and removing old records
- Noticing collection data file sizes far exceed the actual data size

## Running the compact Command

```javascript
// Compact a specific collection
db.runCommand({ compact: "orders" });

// Returns something like:
// { "bytesFreed": 1073741824, "ok": 1 }
```

The `bytesFreed` value shows how many bytes were reclaimed from the collection.

## compact with freeSpaceTargetMB (MongoDB 7.3+)

In MongoDB 7.3+, specify a minimum amount of storage space in megabytes that must be recoverable for compaction to proceed:

```javascript
db.runCommand({
  compact: "events",
  freeSpaceTargetMB: 100
});
// Only compacts if >= 100MB of space can be recovered
// Default value is 20 MB if not specified
```

## Checking Collection Size Before and After

Measure the impact of compaction:

```javascript
// Before compact
db.orders.stats();
// Note: storageSize and totalIndexSize

// Run compact
db.runCommand({ compact: "orders" });

// After compact
db.orders.stats();
```

Key fields to compare:

```text
storageSize      - Total size allocated to collection data
totalIndexSize   - Total size allocated to indexes
size             - Actual size of documents
freeStorageSize  - Space available for reuse (should drop after compact)
```

## compact Behavior by Storage Engine

```text
WiredTiger:
- Rewrites collection data files
- Rebuilds all indexes in parallel after compaction
- MongoDB 4.4+: does not block CRUD operations (only blocks metadata ops like drop/createIndex)
- Returns space to the OS

MMAPv1 (deprecated):
- Defragments but does NOT return space to OS
```

## Running compact Without Blocking Reads (Replica Sets)

On replica sets, run `compact` on secondaries one at a time to avoid blocking the primary:

```bash
# 1. Connect to a secondary
mongosh --host secondary1:27017

# 2. Allow reads from secondary
rs.secondaryOk()

# 3. Run compact
db.runCommand({ compact: "largeCollection" })

# 4. Repeat for other secondaries
# 5. Step down primary and compact it as a secondary
```

## Automating compact with a Script

```javascript
// Compact all collections in a database
const mydb = db.getSiblingDB("mydb");
const collections = mydb.getCollectionNames();

collections.forEach((collName) => {
  print(`Compacting ${collName}...`);
  const result = mydb.runCommand({ compact: collName });
  print(`  Bytes freed: ${result.bytesFreed || "N/A"}`);
});
```

## Estimating Space to Reclaim

Before running compact, estimate potential savings:

```javascript
db.orders.stats().freeStorageSize;
// Returns bytes available for reuse inside collection files

// Convert to MB
(db.orders.stats().freeStorageSize / 1024 / 1024).toFixed(2) + " MB";
```

## Alternative - mongod --repair

For more comprehensive recovery (also repairs data files), use the `--repair` startup option on a standalone `mongod` instance. Note that `repairDatabase` was removed in MongoDB 4.2:

```bash
# Stop mongod first, then run with --repair
mongod --dbpath /data/db --repair
# Rebuilds all data files and indexes
# The instance must be stopped - not suitable for production primaries
```

## Monitoring compact Progress

While compact runs, check the current operation:

```javascript
db.adminCommand({ currentOp: 1, "command.compact": { $exists: true } });
```

## Summary

The `compact` command is the primary tool for reclaiming disk space and defragmenting MongoDB collections after bulk deletions. On replica sets, run it on secondaries first to avoid primary downtime. Always check `freeStorageSize` in collection stats before and after to measure the effect, and use `freeSpaceTargetMB` in MongoDB 7.3+ to skip compaction when the savings would be minimal.
