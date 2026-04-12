# How to Use db.collection.renameCollection() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Administration, Schema, Migration

Description: Learn how to safely rename a MongoDB collection using db.collection.renameCollection(), including cross-database moves and handling existing target collections.

---

## Overview

`db.collection.renameCollection()` renames a MongoDB collection within the same database. It is a metadata-only operation on most deployments, making it fast even for large collections. The command preserves all documents and indexes.

```javascript
db.oldName.renameCollection('newName')
```

## Basic Usage

```javascript
// Rename 'users_v1' to 'users'
db.users_v1.renameCollection('users')
```

On success, MongoDB returns `{ ok: 1 }`. The collection `users_v1` no longer exists and all its documents and indexes are now under `users`.

## Overwriting an Existing Collection

By default, the rename fails if the target collection already exists. Pass `dropTarget: true` to delete the existing target first:

```javascript
db.users_staging.renameCollection('users', true)
// Equivalent to:
db.users_staging.renameCollection('users', { dropTarget: true })
```

Use this with caution - the target collection is permanently deleted.

## Cross-Database Rename using adminCommand

`renameCollection()` on a collection handle is limited to the same database. To move a collection to a different database, use the admin command:

```javascript
db.adminCommand({
  renameCollection: 'sourceDB.orders',
  to: 'archiveDB.orders_2024',
  dropTarget: false
})
```

Note: Cross-database renames require appropriate privileges on both the source and target namespaces, including `find` on the source collection and `insert` on the target collection.

## Scripting a Blue-Green Schema Swap

A common pattern is to build a new version of a collection and then swap it with minimal downtime using two sequential renames:

```javascript
// 1. Build the new collection
db.users_new.insertMany(getTransformedUsers());

// 2. Rename old to backup
db.users.renameCollection('users_backup');

// 3. Rename new to production name
db.users_new.renameCollection('users');

// 4. Validate and clean up backup later
// db.users_backup.drop()
```

This gives you a fast rollback option if the new data has issues.

## Limitations and Considerations

- **Sharded collections** - Starting in MongoDB 5.0, you can rename a sharded collection, but only within the same database. Cross-database renames of sharded collections are not supported.
- **Views** - Renaming a collection that has associated views does not update those views; they will break.
- **Change streams** - Existing change stream cursors on the old collection will stop receiving events. Open new change streams after rename.
- **Application downtime** - While the operation is fast, ensure your application handles the brief period where the old name is unavailable.

## Verifying the Rename

```javascript
// Confirm old name no longer exists
print(db.getCollectionNames().includes('users_v1')); // false

// Confirm new name exists and has expected document count
print(db.users.countDocuments({}));
```

## Summary

`db.collection.renameCollection()` is the simplest way to rename a collection in MongoDB, preserving all data and indexes in a metadata-only operation. It supports fast blue-green swaps when combined with `dropTarget: true`. For cross-database moves, use `db.adminCommand` with the full namespace. Be aware of its limitations with sharded collections and always verify the outcome with a document count check.
