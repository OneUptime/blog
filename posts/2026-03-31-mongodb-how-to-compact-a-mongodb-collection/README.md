# How to Compact a MongoDB Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Storage, Maintenance, Database Administration

Description: Learn how to use MongoDB's compact command to reclaim disk space and defragment storage after large delete operations, including options and best practices.

---

## Overview

When documents are deleted or updated in MongoDB, the space they occupied is not automatically returned to the operating system. Over time, especially after bulk deletes, collections can become fragmented with many empty data blocks. The `compact` command defragments a collection's data files and indexes, potentially reclaiming disk space.

## When to Run compact

Run the `compact` command when:
- You have deleted a large percentage of documents in a collection
- Collection disk usage seems much larger than the actual data size
- Index performance has degraded after many document updates
- You want to reclaim disk space after a data migration or cleanup

## Checking Collection Size Before Compaction

First, check the current storage usage:

```javascript
// Check collection stats
db.orders.stats()

// Look at key size fields
let stats = db.orders.stats();
print("Data size:", stats.size, "bytes");
print("Storage size:", stats.storageSize, "bytes");
print("Total index size:", stats.totalIndexSize, "bytes");
print("Avg object size:", stats.avgObjSize, "bytes");

// Check wiredTiger reuse bytes
print("Reuse blocks:", stats.wiredTiger["block-manager"]["file bytes available for reuse"]);
```

## Running compact

```javascript
// Basic compact command
db.runCommand({ compact: "orders" })

// Force compact to run on a replica set primary
db.runCommand({ compact: "orders", force: true })
```

Before MongoDB 4.4, `compact` blocked all operations on the database and required `force: true` to run on a primary. Starting in MongoDB 4.4 (WiredTiger), `compact` no longer blocks CRUD operations — it only blocks metadata operations like `drop`, `createIndex`, and `dropIndex`.

## Running compact on a Replica Set

On a replica set, the recommended approach is to compact secondaries first, then step down and compact the primary:

```bash
# 1. Connect to a secondary
mongosh --host mongo2:27017

# 2. Run compact on the secondary
use mydb
db.runCommand({ compact: "orders" })

# 3. Repeat for the other secondary

# 4. Step down the primary
rs.stepDown()

# 5. Compact what is now a secondary (former primary)
db.runCommand({ compact: "orders" })
```

This approach avoids any downtime for your application.

## Monitoring compact Progress

The compact command runs synchronously, but you can monitor it from another session:

```javascript
// In a separate mongosh session, check currentOp
db.currentOp({ op: "command", "command.compact": { $exists: true } })
```

Example output:

```javascript
{
  opid: 54321,
  op: "command",
  ns: "mydb.$cmd",
  command: { compact: "orders" },
  msg: "compact: 45.3%",
  secs_running: 120
}
```

## Checking Results After Compaction

```javascript
// After compaction, check stats again
let after = db.orders.stats();
print("Storage size after:", after.storageSize, "bytes");
print("Index size after:", after.totalIndexSize, "bytes");
```

## Limitations and Considerations

- `compact` only works on WiredTiger storage engine collections
- The command may require additional disk space to run
- Before MongoDB 4.4, it blocks all operations on the database; in 4.4+, it only blocks metadata operations (not CRUD)
- For large collections on older MongoDB versions, use a maintenance window
- `compact` does not work on capped collections

## Automating Compaction for Multiple Collections

```javascript
// Compact all user collections in a database
let db_name = "mydb";
use(db_name);

let collections = db.getCollectionNames();
collections.forEach(function(collName) {
  print("Compacting:", collName);
  let result = db.runCommand({ compact: collName });
  if (result.ok) {
    print("  Done");
  } else {
    print("  Error:", result.errmsg);
  }
});
```

## Summary

The `compact` command defragments MongoDB collections and reclaims disk space after bulk deletes or large-scale updates. On replica sets, compact secondaries one at a time before stepping down and compacting the primary to avoid downtime. Always check collection stats before and after to verify space was actually reclaimed, and ensure sufficient free disk space is available since WiredTiger needs working space during the operation.
