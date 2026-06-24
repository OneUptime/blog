# How to Drop a Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Administration, Database, Cleanup

Description: Learn how to drop a MongoDB collection safely using drop(), dropCollection(), and best practices for irreversible deletion in development and production.

---

Dropping a collection in MongoDB permanently removes all documents, indexes, and metadata associated with it. The operation is irreversible without a backup, so understanding the correct commands and safety practices is essential.

## Basic Drop Command

In mongosh, use the `drop()` method on a collection:

```javascript
db.myCollection.drop()
```

The return value is `true` if the collection existed and was dropped, or `false` if it did not exist.

## Using the drop Command

The equivalent command form:

```javascript
db.runCommand({ drop: "myCollection" })
```

This returns a result document:

```json
{ "nIndexesWas": 3, "ns": "myDatabase.myCollection", "ok": 1 }
```

`nIndexesWas` shows how many indexes were removed along with the collection.

## Safely Checking Before Dropping

Always verify a collection exists before dropping, especially in scripts:

```javascript
const collectionName = "tempData";

if (db.getCollectionNames().includes(collectionName)) {
  db[collectionName].drop();
  print(`Dropped: ${collectionName}`);
} else {
  print(`Collection not found: ${collectionName}`);
}
```

## Dropping Multiple Collections Matching a Pattern

```javascript
db.getCollectionNames()
  .filter(name => name.startsWith("temp_"))
  .forEach(name => {
    db[name].drop();
    print(`Dropped: ${name}`);
  });
```

## Drop vs deleteMany - Key Differences

```javascript
// deleteMany removes documents but preserves the collection and indexes
db.myCollection.deleteMany({})

// drop removes everything including indexes and metadata
db.myCollection.drop()
```

Use `deleteMany({})` when you want to keep the collection shell with its indexes (e.g., for immediate repopulation). Use `drop()` when you want to free all storage and start clean.

## What Happens to Indexes

All indexes, including the default `_id` index, are permanently removed when you drop a collection. If you plan to recreate the collection, document your indexes beforehand:

```javascript
// Save index definitions before dropping
const indexDefs = db.myCollection.getIndexes();
printjson(indexDefs);

// Now safe to drop
db.myCollection.drop();
```

## Dropping a Sharded Collection

For sharded collections, use `db.runCommand` with the full drop:

```javascript
db.runCommand({ drop: "shardedCollection" })
```

This removes all chunks and shard metadata. After dropping a sharded collection, run `sh.status()` to confirm the namespace is gone from the routing table.

## Dropping with Write Concern

For durability in replica sets, specify write concern:

```javascript
db.runCommand({
  drop: "myCollection",
  writeConcern: { w: "majority", j: true }
})
```

## Recovery Considerations

MongoDB has no built-in undo for `drop()`. Recovery options:

```bash
# Option 1: Restore from mongodump backup
mongorestore --db myDatabase --collection myCollection /path/to/backup/

# Option 2: WiredTiger has no undelete - point-in-time recovery requires oplog
mongorestore --oplogReplay --oplogLimit "timestamp:increment" /path/to/backup/
```

## Summary

`db.myCollection.drop()` permanently removes a collection including all documents and indexes. Always verify the collection name, check for backups, and use `deleteMany({})` instead if you need to retain the collection structure. Capture index definitions beforehand if you plan to recreate the collection afterward.
