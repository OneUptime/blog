# How to Set Cursor Timeout in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Timeout, Performance, Connection

Description: Learn how to configure cursor timeouts in MongoDB to prevent resource leaks from idle cursors and ensure predictable cleanup of long-running queries.

---

## Understanding MongoDB Cursor Timeout

By default, MongoDB automatically closes server-side cursors that have been inactive for 10 minutes. This timeout mechanism prevents resource leaks when applications fail to close cursors explicitly - for example, due to exceptions, network disconnections, or programming errors.

Understanding and configuring cursor timeouts correctly is important for applications that process large result sets or perform slow batch operations.

## Default Cursor Timeout Behavior

MongoDB's default cursor idle timeout is 10 minutes (600,000 milliseconds). A cursor is considered idle when no `getMore` command has been issued within that window.

```javascript
// This cursor will timeout after 10 minutes of inactivity on the server
const cursor = db.largeCollection.find({ status: "active" });

// If processing each batch takes more than 10 minutes total,
// the server may close the cursor before all documents are fetched
```

## Setting maxTimeMS on a Cursor

Use `maxTimeMS` to set a hard limit on the total time a cursor operation can run. This is different from idle timeout - it controls the total execution time budget.

```javascript
// Cursor must complete within 30 seconds total
const cursor = db.reports.find({ year: 2025 }).maxTimeMS(30000);
```

In Node.js with the official driver:

```javascript
const cursor = collection.find(
  { status: "pending" },
  { maxTimeMS: 30000 }
);

for await (const doc of cursor) {
  await processDocument(doc);
}
```

## Using timeoutMS at the Connection Level

You can configure a default operation timeout at the connection level using the `timeoutMS` option (Client Side Operation Timeout) when creating the MongoClient:

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  timeoutMS: 60000   // 60 seconds timeout for all operations
});
```

This sets a client-side timeout that applies to all operations, including cursor iteration. It is available in MongoDB 7.1+ with Node.js driver 6.x+.

## Adjusting the Server-Side Default Timeout

On the server, the default cursor idle timeout can be changed using the `cursorTimeoutMillis` parameter:

```javascript
// Set server-side cursor idle timeout to 30 minutes
db.adminCommand({
  setParameter: 1,
  cursorTimeoutMillis: 1800000
});
```

This affects all cursors on the server. Use with caution in production.

## Using maxAwaitTimeMS for Tailable Cursors

For tailable cursors using `awaitData`, configure `maxAwaitTimeMS` to control how long the server waits for new data per `getMore` request:

```javascript
const cursor = collection.find(
  {},
  {
    tailable: true,
    awaitData: true,
    maxAwaitTimeMS: 5000   // Wait up to 5 seconds per getMore
  }
);
```

## Python Example with Cursor Timeout

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")
collection = client["mydb"]["largecollection"]

# Set max execution time on the cursor
cursor = collection.find(
    {"status": "active"},
    no_cursor_timeout=False   # Use default server-side timeout
).max_time_ms(30000)

for doc in cursor:
    process(doc)

cursor.close()   # Always close explicitly
```

## Summary

MongoDB cursor timeouts protect servers from resource leaks caused by abandoned cursors. The default 10-minute idle timeout is appropriate for most use cases, but long-running batch jobs may need to disable it with `noCursorTimeout` or extend it with a higher `cursorTimeoutMillis` setting. Use `maxTimeMS` to set hard execution time limits, and always close cursors explicitly when done to release server resources immediately rather than waiting for timeouts to trigger.
