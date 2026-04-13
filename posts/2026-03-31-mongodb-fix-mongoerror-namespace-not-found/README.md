# How to Fix MongoError: Namespace Not Found in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Namespace, Collection, Error, Troubleshooting

Description: Learn why MongoDB raises the Namespace Not Found error and how to fix it by creating collections, checking database names, and handling drop operations safely.

---

## Understanding the Error

In MongoDB, a "namespace" is the combination of a database name and collection name (e.g., `mydb.users`). The `Namespace Not Found` error (error code 26) appears when an operation targets a collection or database that does not exist:

```text
MongoServerError: ns not found
MongoError: Namespace not found
```

## Common Scenarios

### 1. Dropping a Collection That Does Not Exist

The most frequent trigger is calling `drop()` on a non-existent collection:

```javascript
// Throws if 'sessions' collection does not exist
await db.collection('sessions').drop();
```

**Fix:** Check for existence before dropping, or catch the specific error:

```javascript
try {
  await db.collection('sessions').drop();
} catch (err) {
  if (err.code === 26) {
    console.log('Collection does not exist, nothing to drop');
  } else {
    throw err;
  }
}
```

Or use `listCollections` to check first:

```javascript
const collections = await db.listCollections({ name: 'sessions' }).toArray();
if (collections.length > 0) {
  await db.collection('sessions').drop();
}
```

### 2. Dropping an Index on a Missing Collection

```javascript
// Fails if 'orders' does not exist
await db.collection('orders').dropIndex('userId_1');
```

Note that `createIndex` does **not** trigger this error — it implicitly creates the collection if it does not exist. However, `dropIndex` and `dropIndexes` require the collection to already exist.

**Fix:** Ensure the collection exists before dropping indexes:

```javascript
const collections = await db.listCollections({ name: 'orders' }).toArray();
if (collections.length > 0) {
  await db.collection('orders').dropIndex('userId_1');
}
```

### 3. Wrong Database Name

Connecting to the wrong database silently uses a different namespace:

```javascript
// Typo: 'producton' instead of 'production'
const db = client.db('producton');
await db.collection('users').drop(); // ns not found
```

Verify the database name:

```bash
mongosh --eval "db.getMongo().getDBNames()"
```

### 4. Migration Scripts Running Twice

If a migration drops a collection and then runs again, the second run hits a missing namespace:

```javascript
// Safe migration pattern
async function migration() {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const names = collections.map(c => c.name);

  if (names.includes('old_orders')) {
    await db.collection('old_orders').drop();
    console.log('Dropped old_orders');
  } else {
    console.log('old_orders already removed, skipping');
  }
}
```

### 5. Renamed or Deleted Collections in Atlas

In MongoDB Atlas, if you delete a collection through the UI while an application still references it, operations against that namespace will fail. Re-create the collection or update the application to use the new name.

## Verifying Namespace in mongosh

```javascript
// List all collections in the current database
show collections

// or
db.getCollectionNames()

// List databases
show dbs
```

## Summary

`Namespace Not Found` means the collection or database you targeted does not exist. Always check for collection existence before dropping, use `createCollection` explicitly when indexing an empty collection, double-check database and collection names for typos, and make migration scripts idempotent by guarding drops with existence checks.
