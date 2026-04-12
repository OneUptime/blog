# How to Rename a Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Administration, Database, Schema

Description: Learn how to rename a MongoDB collection using renameCollection command, mongosh helpers, and best practices for safe renaming in production environments.

---

Renaming a collection in MongoDB is a metadata operation - it does not copy or move documents. The operation is fast and atomic for standalone instances, though there are important caveats for replica sets and sharded clusters.

## Basic Rename with renameCollection

```javascript
db.adminCommand({
  renameCollection: "myDatabase.oldName",
  to: "myDatabase.newName"
})
```

Note: `renameCollection` is an admin command and requires the fully qualified namespace (database + collection name).

Alternatively, use the `db.collection.renameCollection()` helper in mongosh:

```javascript
// Shorter form - operates on the current database
db.oldCollectionName.renameCollection("newCollectionName")
```

## Rename Across Databases

To move a collection to a different database, specify a different database in the `to` field:

```javascript
db.adminCommand({
  renameCollection: "sourceDB.myCollection",
  to: "targetDB.myCollection"
})
```

Cross-database renames are not atomic - MongoDB copies documents to the new namespace and then drops the original, which means they are slower and use disk I/O.

## Overwriting an Existing Collection

By default, `renameCollection` fails if the target already exists. Use `dropTarget: true` to replace it:

```javascript
db.adminCommand({
  renameCollection: "myDatabase.oldName",
  to: "myDatabase.newName",
  dropTarget: true
})
```

Use this with caution - existing data in the target collection is permanently lost.

## Renaming and Indexes

Indexes are preserved when renaming within the same database. The rename is a metadata operation that updates the collection's namespace pointer; index definitions and data remain intact.

For cross-database renames (document copy), indexes are also copied.

## Checking the Rename Result

```javascript
// Verify the old collection no longer exists
print(db.getCollectionNames().includes("oldName"))  // false

// Verify the new collection exists
print(db.getCollectionNames().includes("newName"))  // true

// Spot-check document count
print(db.newName.countDocuments())
```

## Rename in a Replica Set

In a replica set, `renameCollection` is replicated to all members automatically. The operation appears as a single oplog entry. Ensure you have enough oplog window for the rename to propagate before performing other operations that depend on the new name.

## Sharded Collections

Starting in MongoDB 5.0, `renameCollection` supports sharded collections for same-database renames:

```javascript
db.adminCommand({
  renameCollection: "myDatabase.shardedColl",
  to: "myDatabase.newName"
})
```

Cross-database renames of sharded collections are not supported. If you are on MongoDB 4.4 or earlier, `renameCollection` does not work on sharded collections at all, and you must use an export/import approach:

```bash
# 1. Export
mongoexport --db myDB --collection shardedColl --out /tmp/shardedColl.json

# 2. Import under the new name
mongoimport --db myDB --collection newName --file /tmp/shardedColl.json

# 3. Recreate indexes and shard key on newName

# 4. Drop original after verification
```

## Safe Production Rename Workflow

```javascript
// 1. Confirm collection exists and get count
const beforeCount = db.oldName.countDocuments();
print(`Before: ${beforeCount} documents`);

// 2. Rename
db.oldName.renameCollection("newName");

// 3. Verify
const afterCount = db.newName.countDocuments();
print(`After: ${afterCount} documents`);
print(`Match: ${beforeCount === afterCount}`);

// 4. Verify indexes are preserved
printjson(db.newName.getIndexes());
```

## Summary

Use `db.collection.renameCollection("newName")` in mongosh for quick same-database renames. Same-database renames are fast metadata operations that preserve all indexes and documents. Cross-database renames copy data and are slower. Renaming sharded collections within the same database is supported starting in MongoDB 5.0. Always verify document counts after renaming in production.
