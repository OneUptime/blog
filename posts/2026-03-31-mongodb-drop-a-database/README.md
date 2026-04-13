# How to Drop a Database in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Database, Administration, Cleanup, Security

Description: Learn how to safely drop a MongoDB database using dropDatabase(), including safety checks, write concern options, and recovery considerations for production.

---

Dropping a database in MongoDB permanently deletes all collections, documents, indexes, and the database itself. This is one of the most destructive operations available - understanding the correct commands and safeguards is critical before running it in any environment.

## Basic dropDatabase Command

Switch to the target database and call `dropDatabase()`:

```javascript
use myDatabase
db.dropDatabase()
```

This removes all collections and the database namespace. The return value confirms the operation:

```json
{ "dropped": "myDatabase", "ok": 1 }
```

## Using runCommand Form

The equivalent command document form:

```javascript
use myDatabase
db.runCommand({ dropDatabase: 1 })
```

## Listing Databases Before Dropping

Always confirm you are targeting the correct database:

```javascript
// List all databases with sizes
show dbs

// Or programmatically
db.adminCommand({ listDatabases: 1, nameOnly: true })
```

## Safety Check Script

Never drop a production database without verification:

```javascript
const dbName = "stagingDatabase";

// Check current database
print(`Current db: ${db.getName()}`);

// List all collections
const collections = db.getCollectionNames();
print(`Collections (${collections.length}): ${collections.join(", ")}`);

// Count total documents
let totalDocs = 0;
collections.forEach(coll => {
  totalDocs += db[coll].countDocuments();
});
print(`Total documents: ${totalDocs}`);

// Proceed only if confirmed
if (db.getName() === dbName) {
  db.dropDatabase();
  print("Dropped.");
}
```

## Drop with Write Concern

For replica sets, ensure the drop is acknowledged by a majority of members:

```javascript
db.runCommand({
  dropDatabase: 1,
  writeConcern: { w: "majority", j: true }
})
```

## Dropping a Database via mongosh Shell

From the command line:

```bash
mongosh "mongodb://localhost:27017/myDatabase" \
  --eval 'db.dropDatabase()'
```

For authenticated instances:

```bash
mongosh "mongodb://admin:password@localhost:27017/myDatabase?authSource=admin" \
  --eval 'db.dropDatabase()'
```

## What is NOT Removed

`dropDatabase` removes all data and metadata for the database. However:
- Users associated with the dropped database are **not** removed. To remove them, run `db.dropAllUsers()` before or after dropping the database.
- Users in the `admin` database with access to the dropped database retain their user accounts - only the data is gone.
- Atlas-managed clusters may retain billing data and monitoring history.

## Disk Space Reclamation

When a database is dropped, WiredTiger deletes the underlying data files from the filesystem, and the OS reclaims that disk space. This is different from deleting individual documents, where WiredTiger reuses freed space internally but does not shrink collection files. If you need to reclaim space from document deletions in other databases, use the `compact` command on those specific collections.

## Preventing Accidental Drops

Protect production databases by creating a read-only or restricted user:

```javascript
db.createUser({
  user: "appUser",
  pwd: "securePass",
  roles: [{ role: "readWrite", db: "myDatabase" }]
  // no dbAdmin or higher roles
})
```

Users without `dbAdmin` or `dbOwner` role cannot execute `dropDatabase`.

## Summary

`db.dropDatabase()` irreversibly removes all collections and data in the current database. Always verify the active database with `db.getName()` before executing. Use write concern `majority` on replica sets, ensure a backup exists, and restrict `dbAdmin` role access in production to prevent accidental drops.
