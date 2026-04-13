# How to Use Capped Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Operation, Logging, Administration

Description: Learn how to create and use MongoDB capped collections for fixed-size circular buffers ideal for logging, event queues, and audit trails with automatic oldest-first deletion.

---

## What are Capped Collections

A capped collection in MongoDB is a fixed-size circular buffer. When the collection reaches its maximum size, the oldest documents are automatically deleted to make room for new ones. Documents are always returned in insertion order, and there is no need to manually purge old data.

```mermaid
flowchart LR
    I1[Insert 1] --> C
    I2[Insert 2] --> C
    I3[Insert 3] --> C
    subgraph C[Capped Collection - size 3]
        D1[Doc 1] --> D2[Doc 2] --> D3[Doc 3]
    end
    I4[Insert 4 - oldest deleted] --> C2
    subgraph C2[After Insert 4]
        D2b[Doc 2] --> D3b[Doc 3] --> D4[Doc 4]
    end
```

## Creating a Capped Collection

```javascript
db.createCollection("appLogs", {
  capped: true,
  size: 10485760,    // maximum size in bytes (10MB)
  max: 10000         // optional: maximum number of documents
})
```

- `size` - required; maximum size of the collection in bytes. Must be at least 4096 bytes. MongoDB may round up to the nearest multiple of 256.
- `max` - optional maximum document count. MongoDB enforces both the `size` and `max` limits independently; whichever limit is reached first triggers removal of the oldest documents.

## Inserting Documents

Insertion works exactly like a regular collection:

```javascript
db.appLogs.insertOne({
  level: "INFO",
  message: "User login successful",
  userId: "u123",
  timestamp: new Date()
})

db.appLogs.insertMany([
  { level: "ERROR", message: "DB connection failed", timestamp: new Date() },
  { level: "WARN",  message: "High memory usage: 85%", timestamp: new Date() }
])
```

## Querying Capped Collections

Capped collections always return documents in insertion order (natural order) by default:

```javascript
// Most recent documents last (insertion order)
db.appLogs.find()

// Most recent documents first (reverse natural order)
db.appLogs.find().sort({ $natural: -1 }).limit(20)
```

Query with filters:

```javascript
db.appLogs.find({ level: "ERROR" }).sort({ $natural: -1 }).limit(50)
```

## Tailable Cursors

One of the most powerful features of capped collections is the tailable cursor. Like `tail -f` on a log file, a tailable cursor waits for new documents to be inserted instead of closing when it reaches the end.

In the legacy mongo shell (`mongo`):

```javascript
const cursor = db.appLogs.find().addOption(DBQuery.Option.tailable).addOption(DBQuery.Option.awaitData);

while (cursor.hasNext() || cursor.isExhausted() === false) {
  if (cursor.hasNext()) {
    print(JSON.stringify(cursor.next()));
  }
}
```

In Node.js:

```javascript
const { MongoClient } = require("mongodb");

async function tailLogs() {
  const client = new MongoClient("mongodb://admin:password@127.0.0.1:27017/?authSource=admin");
  await client.connect();

  const db = client.db("myapp");
  const cursor = db.collection("appLogs").find({}, {
    tailable: true,
    awaitData: true,
    noCursorTimeout: false
  });

  console.log("Listening for new log entries...");

  for await (const doc of cursor) {
    console.log(`[${doc.level}] ${doc.timestamp.toISOString()} - ${doc.message}`);
  }
}

tailLogs().catch(console.error);
```

## Converting a Regular Collection to Capped

For a safe conversion with full control, create a new capped collection and copy the data:

```javascript
// Step 1: Create the capped collection
db.createCollection("appLogs_capped", { capped: true, size: 10485760 })

// Step 2: Copy existing data (inserts in natural order)
db.appLogs.find().forEach(doc => {
  db.appLogs_capped.insertOne(doc);
})

// Step 3: Rename collections
db.appLogs.renameCollection("appLogs_backup")
db.appLogs_capped.renameCollection("appLogs")
```

Alternatively, use the `convertToCapped` command (converts in-place, but only adds the size cap - not recommended for production without a maintenance window):

```javascript
db.runCommand({ convertToCapped: "appLogs", size: 10485760 })
```

## Checking if a Collection is Capped

```javascript
db.appLogs.isCapped()
```

View collection details:

```javascript
db.appLogs.stats()
```

The `stats()` output includes `capped: true`, `max` (document limit), and `maxSize` (byte limit).

## Use Cases

**Application logging** - store the last N log lines in MongoDB without needing a separate log rotation process.

**Audit trail** - retain a rolling window of the last 90 days of user actions.

**Event queue** - producers insert events, and a tailable cursor consumer processes them in order.

**Cache** - keep the most recent N items of a frequently-updated metric.

**Replication oplog** - MongoDB's internal replication log (`local.oplog.rs`) is itself a capped collection.

## Limitations

- You cannot delete individual documents from a capped collection.
- You cannot update a document in a way that would increase its size (the updated document cannot be larger than the original).
- You cannot shard a capped collection.
- Cannot create TTL indexes on capped collections.
- The `_id` index is created automatically. You can create additional secondary indexes on capped collections.

## Capped Collection for Audit Logs Example

```javascript
// Create a 30-day rolling audit log (assuming ~1KB per event, ~100K events per day)
// 30 days * 100K events * 1KB = ~3GB
db.createCollection("auditLog", {
  capped: true,
  size: 3221225472,   // 3GB in bytes
  max: 3000000        // 3 million documents cap
})

// Insert audit events
function logAuditEvent(userId, action, resource, ip) {
  db.auditLog.insertOne({
    userId,
    action,      // "read", "write", "delete", "admin"
    resource,    // collection and document ID
    ip,
    timestamp: new Date()
  });
}

logAuditEvent("u123", "delete", "orders/ord-456", "10.0.0.5");
```

## Best Practices

- Size your capped collection generously - it is difficult to resize without downtime. Use `db.runCommand({ convertToCapped: "collName", size: newSize })` but note this truncates data.
- Use the `max` parameter as a secondary safety limit, not the primary one.
- Use tailable cursors for real-time processing rather than polling the collection.
- Add a secondary index on fields you frequently filter by (like `level` or `userId`), even though the collection is capped.
- For rolling time-window logs where you want TTL-based deletion instead of size-based, use a regular collection with a TTL index instead of a capped collection.

## Summary

Capped collections are fixed-size circular buffers that automatically delete the oldest documents when full. They support insertion-order queries and tailable cursors, making them ideal for logging, audit trails, and event queues. Create them with `db.createCollection()` specifying `capped: true` and a `size` limit. Use tailable cursors in Node.js for real-time event processing. Remember that individual document deletion is not supported - if you need that, use a TTL index on a regular collection instead.
