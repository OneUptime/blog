# What Is a Capped Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Log, Circular Buffer, TTL

Description: Learn what MongoDB capped collections are, how they work as circular buffers, and when to use them for logs, caches, and rolling windows of data.

---

## What Is a Capped Collection

A capped collection is a fixed-size circular buffer collection in MongoDB. When it reaches its maximum size, the oldest documents are automatically overwritten by new ones. Documents are always stored and returned in insertion order.

## Key Characteristics

- Fixed maximum size (in bytes, required)
- Optional maximum document count
- Insertion order is preserved
- Has an `_id` field and `_id` index by default (like regular collections)
- Cannot delete individual documents prior to MongoDB 5.0 (starting in 5.0, individual deletes are supported)
- Cannot shard a capped collection

## Creating a Capped Collection

```javascript
// Create with max size only (10MB)
db.createCollection("application_logs", {
  capped: true,
  size: 10485760  // 10MB in bytes
})

// Create with size and max document count (whichever limit is hit first)
db.createCollection("recent_events", {
  capped: true,
  size: 5242880,  // 5MB
  max: 10000      // 10,000 documents
})
```

## Inserting into a Capped Collection

Works exactly like a regular collection:

```javascript
db.application_logs.insertOne({
  level: "ERROR",
  message: "Connection timeout",
  service: "api",
  timestamp: new Date()
})
```

When the collection is full, the oldest document is removed to make room.

## Reading in Insertion Order

```javascript
// Returns documents in insertion order (natural order)
db.application_logs.find().sort({ $natural: 1 })

// Reverse insertion order (most recent first)
db.application_logs.find().sort({ $natural: -1 }).limit(50)
```

## Tailable Cursors

Capped collections support tailable cursors - cursors that stay open and wait for new data, similar to `tail -f` in Unix:

```javascript
// Node.js driver
const cursor = db.collection("application_logs").find({}, {
  tailable: true,
  awaitData: true
})

for await (const doc of cursor) {
  console.log("New log:", doc.message)
}
```

Note: Tailable cursors are used through application drivers (Node.js, Python, Java, etc.), not through the mongo shell.

## Checking If a Collection Is Capped

```javascript
db.application_logs.isCapped()  // returns true or false

// More details
db.application_logs.stats()
// Look for: capped: true, maxSize, max
```

## Converting a Regular Collection to Capped

```javascript
db.runCommand({
  convertToCapped: "my_collection",
  size: 10485760
})
```

## When to Use Capped Collections

Good use cases:
- Application log buffers (retain last N logs)
- Recent activity feeds with bounded storage
- Metric snapshots where only current state matters
- Change notification queues consumed via tailable cursors

Avoid when:
- You need to delete specific documents
- You need random-access queries beyond natural order
- Data retention must be time-based rather than count/size-based (use TTL index instead)

## Summary

Capped collections are fixed-size circular buffers that automatically evict the oldest documents when full. They preserve insertion order and support tailable cursors for real-time log streaming. Use them for bounded log buffers, activity feeds, and notification queues where you want automatic eviction based on size or count limits.
