# How to Create a Capped Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Fixed-Size Collection, Storage, Database Design

Description: Learn how to create and use capped collections in MongoDB for fixed-size, high-throughput storage that automatically overwrites the oldest documents.

---

## Overview

A capped collection in MongoDB is a fixed-size collection that automatically overwrites the oldest documents when it reaches its maximum size. Documents are stored and retrieved in insertion order, making capped collections ideal for logs, event streams, and recent-activity feeds.

## Creating a Capped Collection

Use `db.createCollection()` with the `capped` and `size` options:

```javascript
// Create a capped collection with a maximum size of 10 MB
db.createCollection("logs", {
  capped: true,
  size: 10485760  // 10 MB in bytes
});
```

You can also limit the maximum number of documents:

```javascript
// Max 10 MB and no more than 5000 documents
db.createCollection("events", {
  capped: true,
  size: 10485760,
  max: 5000
});
```

Both limits are enforced simultaneously - whichever is hit first triggers the overwrite of old documents.

## Verifying a Capped Collection

Check whether a collection is capped:

```javascript
db.logs.isCapped();  // returns true or false

// Get full collection stats
db.logs.stats();
```

The output of `stats()` includes `capped: true`, `maxSize`, and `max` fields.

## Inserting Documents

Inserting into a capped collection works exactly like any other collection:

```javascript
db.logs.insertOne({
  level: "INFO",
  message: "Server started",
  timestamp: new Date()
});

db.logs.insertMany([
  { level: "WARN", message: "High memory usage", timestamp: new Date() },
  { level: "ERROR", message: "Connection refused", timestamp: new Date() }
]);
```

## Querying a Capped Collection

Documents are returned in natural (insertion) order by default:

```javascript
// Returns documents from oldest to newest
db.logs.find().sort({ $natural: 1 });

// Returns documents from newest to oldest
db.logs.find().sort({ $natural: -1 });
```

## Updating Documents in a Capped Collection

Updates are allowed as long as the document size does not change. You cannot increase or decrease a document's size:

```javascript
// Allowed: updating an existing field to a value of the same size
db.logs.updateOne(
  { level: "WARN" },
  { $set: { level: "SEEN" } }
);
```

## Restrictions on Capped Collections

- You cannot delete individual documents from a capped collection.
- You cannot shard a capped collection.
- Capped collections cannot use TTL indexes.
- The `$out` aggregation stage cannot write to a capped collection.
- You cannot write to capped collections in transactions.

## Converting a Regular Collection to Capped

Use the `convertToCapped` command to convert an existing collection:

```javascript
db.runCommand({
  convertToCapped: "myLogs",
  size: 5242880  // 5 MB
});
```

This operation requires a database lock and rebuilds the collection - use it during maintenance windows.

## Dropping a Capped Collection

```javascript
db.logs.drop();
```

## Practical Use Case: Application Log Buffer

```javascript
// Create a log buffer keeping the last 1000 log entries
db.createCollection("appLogs", {
  capped: true,
  size: 1048576,  // 1 MB
  max: 1000
});

// Insert a log entry
async function logEvent(level, message, metadata) {
  await db.collection("appLogs").insertOne({
    level,
    message,
    metadata,
    timestamp: new Date()
  });
}

// Retrieve the last 50 log entries
async function getRecentLogs(limit = 50) {
  return db.collection("appLogs")
    .find({})
    .sort({ $natural: -1 })
    .limit(limit)
    .toArray();
}
```

## Summary

Capped collections provide a simple, efficient mechanism for storing a bounded set of recent documents. They maintain insertion order, automatically expire old data when the size or document limit is reached, and support high-throughput inserts. They are best suited for logs, metrics buffers, and event queues where you only care about the most recent data.
