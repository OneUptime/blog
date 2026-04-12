# How to Rename a MongoDB Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Administration, Migration

Description: Learn how to rename a MongoDB database by copying collections to a new database and dropping the original, since MongoDB has no direct rename command.

---

MongoDB does not have a native `renameDatabase` command. To rename a database, you copy all its collections to a new database and then drop the original. This guide walks through the process safely.

## Method 1: Using mongodump and mongorestore

This is the safest approach for production databases.

**Step 1 - Dump the source database:**

```bash
mongodump --db olddbname --out /tmp/mongodump-backup
```

**Step 2 - Restore to the new database name:**

```bash
mongorestore --nsFrom 'olddbname.*' --nsTo 'newdbname.*' /tmp/mongodump-backup
```

**Step 3 - Verify the new database:**

```javascript
use newdbname
show collections
db.stats()
```

**Step 4 - Drop the old database after confirming success:**

```javascript
use olddbname
db.dropDatabase()
```

## Method 2: Using $out Aggregation in mongosh (Small Databases)

For small databases you can use mongosh scripting to copy each collection:

```javascript
// List all collections in the old database
use olddbname
const collections = db.getCollectionNames()

// Copy each collection to the new database
collections.forEach(function(collName) {
  db.getCollection(collName).aggregate([
    { $out: { db: "newdbname", coll: collName } }
  ])
  print("Copied: " + collName)
})
```

Verify the copy:

```javascript
use newdbname
show collections
```

Then drop the original:

```javascript
use olddbname
db.dropDatabase()
```

## Handling Indexes

The `$out` aggregation stage does not preserve indexes. After copying, rebuild them:

```javascript
use newdbname

// Check existing indexes (only _id will exist after $out)
db.users.getIndexes()

// Recreate needed indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.orders.createIndex({ userId: 1, createdAt: -1 })
```

When using `mongorestore`, indexes from the dump are restored automatically.

## Handling Users and Roles

Database users are stored in the `admin` database and reference databases by name. After renaming, update user privileges:

```javascript
use admin
db.updateUser("appuser", {
  roles: [{ role: "readWrite", db: "newdbname" }]
})
```

## Best Practices

- Stop write traffic to the source database before renaming to avoid data loss.
- Use `mongodump`/`mongorestore` for production to preserve indexes and metadata.
- Test the renamed database thoroughly before dropping the original.

## Summary

MongoDB databases cannot be renamed directly. The standard approach is to dump the source database with `mongodump`, restore it under a new name with `mongorestore`, verify correctness, and then drop the old database. After renaming, recreate indexes if using `$out` and update user role bindings.
