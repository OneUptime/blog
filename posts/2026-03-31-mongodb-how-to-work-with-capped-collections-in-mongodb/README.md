# How to Work with Capped Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Log Storage, Circular Buffer, Performance

Description: Learn how to create, query, and manage capped collections in MongoDB for fixed-size circular buffers ideal for logs and event streams.

---

## What Are Capped Collections?

Capped collections are fixed-size collections in MongoDB that automatically overwrite the oldest documents when they reach their size limit. They behave like a circular buffer - once full, new inserts push out the oldest data.

Key characteristics:
- Fixed maximum size in bytes
- Optional maximum document count
- Documents are stored and returned in insertion order
- Support tailable cursors for real-time streaming
- No individual document deletions before MongoDB 5.0 (starting in 5.0, deletes are permitted)

## Creating a Capped Collection

Use `createCollection` with `capped: true`:

```javascript
// Create a capped collection: 10MB max, 10,000 documents max
db.createCollection("applicationLogs", {
  capped: true,
  size: 10485760,  // 10MB in bytes (required)
  max: 10000       // optional: maximum number of documents
})
```

Both `size` and `max` can be set, but `size` is always required. If both are specified, MongoDB removes documents when either limit is reached.

## Inserting Documents

Insert works the same as regular collections:

```javascript
db.applicationLogs.insertOne({
  level: "INFO",
  message: "User logged in",
  userId: "user123",
  timestamp: new Date()
})

// Bulk insert
db.applicationLogs.insertMany([
  { level: "ERROR", message: "Database connection failed", timestamp: new Date() },
  { level: "WARN", message: "High memory usage detected", timestamp: new Date() },
  { level: "INFO", message: "Cache cleared", timestamp: new Date() }
])
```

## Querying a Capped Collection

Standard queries work normally:

```javascript
// Find recent errors
db.applicationLogs.find({ level: "ERROR" }).sort({ $natural: -1 }).limit(10)

// Find logs in natural (insertion) order
db.applicationLogs.find().sort({ $natural: 1 })

// Count documents
db.applicationLogs.countDocuments()
```

Use `$natural: -1` to query in reverse insertion order (most recent first).

## Tailable Cursors

Tailable cursors are the most powerful feature of capped collections. They stay open after reaching the end of the collection and block until new documents arrive - similar to `tail -f` on a log file:

```javascript
// Open a tailable cursor in mongosh
const cursor = db.applicationLogs.find(
  { level: "ERROR" }
).tailable({ awaitData: true }).noCursorTimeout()

// In Node.js with the MongoDB driver
const cursor = db.collection("applicationLogs").find(
  { level: "ERROR" },
  { tailable: true, awaitData: true }
)

for await (const doc of cursor) {
  console.log("New error log:", doc.message)
}
```

## Checking If a Collection Is Capped

```javascript
db.applicationLogs.isCapped()  // returns true or false

// Get collection stats including capped status
db.applicationLogs.stats()
// Look for "capped": true, "maxSize", "max" in the output
```

## Limitations of Capped Collections

```javascript
// These operations are NOT allowed on capped collections:

// 1. No document deletion (before MongoDB 5.0; starting in 5.0, deletes are allowed)
db.applicationLogs.deleteOne({ _id: someId })  // ERROR before MongoDB 5.0

// 2. No updates that increase document size
db.applicationLogs.updateOne(
  { _id: someId },
  { $set: { message: "A very long new message that is larger than original" } }
)
// May fail if it increases document size

// 3. No shard key on a capped collection
// Capped collections cannot be sharded

// 4. No TTL indexes on capped collections
```

## Converting a Regular Collection to Capped

```javascript
// Convert an existing collection to capped
db.runCommand({
  convertToCapped: "regularLogs",
  size: 5242880  // 5MB
})
```

Note: this acquires a database-level exclusive lock and may impact performance on busy systems.

## Practical Use Case: Application Log Buffer

```javascript
// Setup: create a capped collection for recent logs
db.createCollection("recentLogs", {
  capped: true,
  size: 104857600,  // 100MB
  max: 500000
})

// Application code writes logs
function logEvent(level, message, metadata) {
  db.recentLogs.insertOne({
    level,
    message,
    metadata,
    timestamp: new Date(),
    host: process.env.HOSTNAME
  })
}

// Dashboard reads recent errors
db.recentLogs.find({ level: { $in: ["ERROR", "FATAL"] } })
  .sort({ $natural: -1 })
  .limit(100)
```

## Summary

Capped collections provide an efficient, automatically managed circular buffer for time-ordered data like logs, events, and metrics. They support tailable cursors for real-time streaming, store documents in insertion order, and automatically expire old data when the size limit is reached. Use them for high-write, read-recent workloads where you do not need to delete individual documents.
