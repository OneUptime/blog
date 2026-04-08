# How to Defragment Collections in MongoDB with compact()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compact, Performance, Storage, Administration, Operation

Description: Learn how to use MongoDB's compact() command to defragment collections and indexes, reclaim disk space, and improve query performance after heavy delete or update workloads.

---

## Why Collections Become Fragmented

When MongoDB deletes documents or updates them to a smaller size, the space they occupied is reused for future inserts but may not be returned to the operating system. Over time, after many deletes and updates, a collection can contain significant unused space (fragmentation), which:

- Wastes disk space
- Increases the amount of data WiredTiger must scan
- Can degrade cache efficiency

```mermaid
flowchart LR
    A[Collection: 10GB] -->|Delete 40% of documents| B[Collection: still reports 10GB on disk]
    B -->|compact| C[Collection: 6GB on disk]
    C --> D[Space returned to OS]
    D --> E[Reduced cache footprint]
```

## Checking Collection Fragmentation

Before running compact, check how much space can be reclaimed:

```javascript
const stats = db.orders.stats();

const dataSize = stats.size;                // logical data size
const storageSize = stats.storageSize;      // actual disk space allocated
const freeListSize = stats.wiredTiger?.["btree: pages reused by compaction"] || 0;

const wasteRatio = ((storageSize - dataSize) / storageSize * 100).toFixed(1);

print("Data size:     " + (dataSize / 1048576).toFixed(0) + " MB");
print("Storage size:  " + (storageSize / 1048576).toFixed(0) + " MB");
print("Wasted space:  " + wasteRatio + "%");
```

A waste ratio above 20-30% is a good indicator that compact could help.

## Running compact()

`compact()` rewrites all data files for the collection, removing fragmentation. It also compacts all indexes on the collection.

```javascript
db.runCommand({ compact: "orders" })
```

Expected output on success:

```text
{ bytesFreed: 2147483648, ok: 1 }
```

`bytesFreed` shows how many bytes were returned to the filesystem.

## compact() Behavior

- **WiredTiger**: `compact()` rewrites the collection to remove fragmentation and returns space to the OS.
- The command runs in the foreground on the target node but does not block MongoDB CRUD operations on the database being compacted.
- On a replica set, it runs on the targeted node only; run it on each member separately.
- Starting in MongoDB 6.0.2, a secondary node can replicate while compact is running, and reads are permitted.

## Running compact on a Replica Set

To minimize impact on production traffic, run `compact()` on secondaries first:

```bash
# Connect to secondary member
mongosh "mongodb://admin:password@secondary1:27017/?authSource=admin"
```

```javascript
// Verify you are on a secondary
rs.status().myState   // should be 2 (SECONDARY)

// Run compact on the secondary
db.runCommand({ compact: "orders" })
```

After compacting all secondaries, step down the primary and compact it while it is acting as a secondary:

```javascript
// On the primary, step down
rs.stepDown(60)   // step down for 60 seconds

// Wait for a new primary to be elected, then compact the stepped-down node
db.runCommand({ compact: "orders" })
```

## force Option for Primary Nodes

By default, compact is intended to be run on secondary nodes. To run compact directly on the primary in a replica set, use the `force` option:

```javascript
db.runCommand({ compact: "orders", force: true })
```

On a standalone instance, compact requires no special options. On an arbiter (which has no data), compact is not needed.

## compactStructuredEncryptionData

For collections with Queryable Encryption, use the dedicated command instead:

```javascript
db.runCommand({ compactStructuredEncryptionData: "patients" })
```

## When to Run compact

Good times to run compact:

- After a large batch delete operation (deleted > 20% of the collection).
- After a data migration where old documents were removed.
- After converting document schemas that significantly shrank document sizes.
- As part of a scheduled maintenance window if disk usage has grown unexpectedly.

Do not run compact:

- During peak traffic hours (it consumes significant I/O and CPU resources).
- On collections where data size naturally fluctuates frequently - the benefit will be short-lived.

## Automating compact with a Script

The following script compacts all user collections in a database during a maintenance window:

```javascript
const db = db.getSiblingDB("myapp");
const systemCollections = ["system.profile", "system.users", "system.views"];

const collections = db.getCollectionNames().filter(name => !systemCollections.includes(name));

collections.forEach(collName => {
  print("Compacting: " + collName + " at " + new Date().toISOString());
  const result = db.runCommand({ compact: collName });
  if (result.ok) {
    print("  Done. Freed: " + (result.bytesFreed / 1048576).toFixed(0) + " MB");
  } else {
    print("  ERROR: " + JSON.stringify(result));
  }
});
```

Run the script during a maintenance window:

```bash
mongosh "mongodb://admin:password@127.0.0.1:27017/myapp?authSource=admin" \
  --file compact-all.js
```

## Monitoring Progress

`compact()` is a long-running command. Monitor its progress by checking `currentOp()` from another mongosh session:

```javascript
// In a separate mongosh session
db.adminCommand({ currentOp: 1 }).inprog.filter(op => op.command.compact)
```

Output:

```text
[
  {
    opid: 12345,
    active: true,
    op: "command",
    command: { compact: "orders" },
    secs_running: 45,
    msg: "compact 42% complete"
  }
]
```

## Alternative: Repopulating via mongodump/mongorestore

For maximum space reclamation without a blocking lock, export and reimport the collection:

```bash
# Dump the collection
mongodump --uri "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --db myapp --collection orders --out /tmp/dump

# Drop the original collection
mongosh --eval 'db.orders.drop()' "mongodb://admin:password@127.0.0.1:27017/myapp?authSource=admin"

# Restore from dump
mongorestore --uri "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --db myapp --collection orders /tmp/dump/myapp/orders.bson
```

This approach requires sufficient disk space for the dump and creates a brief window where the collection does not exist.

## Best Practices

- Check fragmentation with `db.collection.stats()` before deciding whether compact is worthwhile.
- Run compact on replica set secondaries first during off-peak hours to minimize primary load.
- Monitor compact progress via `currentOp()` to estimate completion time.
- Schedule compact as part of your regular maintenance playbook for collections with heavy delete workloads.
- After compacting, verify the space was freed with `df -h` on the database host.

## Summary

MongoDB's `compact()` command defragments a collection and its indexes, returning unused space to the operating system. It is most useful after large batch deletes or updates that significantly reduced document sizes. While the command does not block CRUD operations, it consumes significant I/O and CPU resources, so run it on replica set secondaries during off-peak hours and step down the primary to compact it last. Check fragmentation beforehand with `db.collection.stats()` and monitor progress via `currentOp()`.
