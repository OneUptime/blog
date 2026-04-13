# How to Fix MongoError: Cannot Create Index on a Capped Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Index, Capped Collection, Error, Administration

Description: Learn why MongoDB restricts index creation on capped collections and how to fix it by understanding the limitations and using the correct index types.

---

## Understanding the Error

Capped collections in MongoDB have strict limitations on index creation. Attempting to create a non-`_id` index on a capped collection may fail with:

```text
MongoServerError: cannot create index on capped collection
MongoServerError: cannot create index on capped collection: indexes with a TTL field are not allowed
```

## What Is a Capped Collection?

A capped collection is a fixed-size, circular collection that automatically overwrites the oldest documents when it reaches capacity. It maintains insertion order and is useful for logs, queues, and event streams.

```javascript
// Create a capped collection (1 MB, max 1000 documents)
await db.createCollection('logs', {
  capped: true,
  size: 1048576,  // 1 MB in bytes
  max: 1000
});
```

## Index Restrictions on Capped Collections

Capped collections automatically have the `_id` index. You can create most additional index types, but there is one key restriction:

1. **TTL indexes are not allowed** - capped collections manage expiry through size limits, not TTL

Other index types — including unique, text, geospatial, and compound indexes — are allowed on capped collections:

```javascript
// This IS allowed
await db.collection('logs').createIndex({ level: 1 });

// This IS NOT allowed - TTL
await db.collection('logs').createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
// Error: cannot create index on capped collection
```

## Fix 1: Use a Regular Collection With a TTL Index

If you need time-based expiry, use a regular collection with a TTL index instead of a capped collection:

```javascript
// Create regular collection
await db.createCollection('logs');

// TTL index - documents expire after 7 days
await db.collection('logs').createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 3600 }
);
```

## Fix 2: Use a Regular Collection With a Fixed-Size Constraint in Application Code

If you want fixed-size behavior with flexible indexing, manage size in your application:

```javascript
// Keep only the last 10,000 log entries
async function insertLog(db, logEntry) {
  await db.collection('logs').insertOne(logEntry);

  const count = await db.collection('logs').countDocuments();
  if (count > 10000) {
    // Remove the oldest documents
    const oldest = await db.collection('logs')
      .find()
      .sort({ _id: 1 })
      .limit(count - 10000)
      .project({ _id: 1 })
      .toArray();

    await db.collection('logs').deleteMany({
      _id: { $in: oldest.map(d => d._id) }
    });
  }
}
```

## Fix 3: Convert Capped to Regular Collection

If you already have a capped collection and need more indexing flexibility:

```javascript
// Step 1: Copy data to a new regular collection
db.cappedLogs.aggregate([{ $out: "logs_regular" }])

// Step 2: Create needed indexes on the regular collection
await db.collection('logs_regular').createIndex({ level: 1, createdAt: -1 });

// Step 3: Rename
db.logs_regular.renameCollection('logs')
```

## Allowed Indexes on Capped Collections

```javascript
// Simple ascending index - allowed
await db.collection('cappedLogs').createIndex({ severity: 1 });

// Compound index - allowed
await db.collection('cappedLogs').createIndex({ severity: 1, service: 1 });
```

## Summary

Capped collections do not support TTL indexes. If you need time-based document expiry, migrate to a regular collection with a TTL index, or implement application-level size management. Other index types — including unique, text, geospatial, and compound indexes — are supported on capped collections.
