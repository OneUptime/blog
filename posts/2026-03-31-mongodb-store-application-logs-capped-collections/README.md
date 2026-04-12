# How to Store Application Logs in MongoDB Capped Collections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Logging, Operation, Storage

Description: Learn how to use MongoDB capped collections as a fixed-size circular buffer for storing application logs with automatic oldest-first eviction.

---

## Overview

Capped collections are fixed-size MongoDB collections that automatically overwrite the oldest documents when they reach their size limit. This makes them ideal for storing recent application logs where you want a rolling window of data without manual cleanup.

## Creating a Capped Collection for Logs

```javascript
db.createCollection("app_logs", {
  capped: true,
  size: 104857600,  // 100 MB in bytes
  max: 100000       // Optional: max 100,000 documents
})
```

The `size` parameter is required and sets the maximum storage in bytes. The `max` parameter is optional - the collection is capped by whichever limit is reached first.

## Inserting Log Documents

```javascript
db.app_logs.insertOne({
  timestamp: new Date(),
  level: "error",
  service: "auth-service",
  message: "Invalid JWT token",
  userId: "user-789",
  ip: "192.168.1.1"
})
```

Inserts into capped collections maintain insertion order. When the collection reaches its size limit, MongoDB automatically removes the oldest documents to make room.

## Querying Recent Logs

```javascript
// Get the last 50 log entries
db.app_logs.find().sort({ $natural: -1 }).limit(50)

// Query errors from a specific service
db.app_logs.find({
  level: "error",
  service: "auth-service"
}).sort({ $natural: -1 }).limit(20)
```

Capped collections support `$natural` sort order (insertion order) efficiently without an index.

## Tailing a Capped Collection with a Tailable Cursor

Capped collections support **tailable cursors** - cursors that block and wait for new documents rather than closing when they reach the end. This is useful for building a live log tailer:

```javascript
const cursor = db.app_logs.find().tailable({ awaitData: true });

while (cursor.hasNext()) {
  const log = cursor.next();
  console.log(`[${log.level.toUpperCase()}] ${log.service}: ${log.message}`);
}
```

In Node.js with the MongoDB driver:

```javascript
const cursor = collection.find(
  {},
  { tailable: true, awaitData: true, noCursorTimeout: true }
);

for await (const doc of cursor) {
  console.log(doc);
}
```

## Checking Collection Stats

```javascript
db.app_logs.stats()
```

This shows `storageSize`, `count`, and `capped: true` to confirm configuration. Monitor `storageSize` relative to your cap to understand how far back your log window extends.

## Converting a Regular Collection to Capped

```javascript
db.runCommand({
  convertToCapped: "app_logs",
  size: 104857600
})
```

Note: this command acquires an exclusive lock on the parent database. Run it during maintenance windows on large collections.

## Limitations to Know

```text
- Updates that increase document size are not allowed
- Document deletion is not allowed before MongoDB 5.0 (permitted in 5.0+)
- Capped collections cannot be sharded
- No TTL indexes can be added to capped collections
```

## Best Practices

- Size your capped collection to hold at least 24-48 hours of logs under peak load so you always have recent history for debugging.
- Use capped collections for hot, recent logs and TTL-indexed regular collections for longer retention (7-30 days).
- Add an index on `level` and `service` even in capped collections if you frequently filter by those fields.
- Avoid updating documents in capped collections - treat them as append-only.

## Summary

Capped collections provide a simple, zero-maintenance rolling log buffer with automatic oldest-document eviction. Use them for storing recent application logs where you need tailable cursors for real-time streaming or fast access to the most recent entries.
