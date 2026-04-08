# How to Configure cursorTimeoutMillis in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Configuration, Performance

Description: Learn how to configure cursorTimeoutMillis in MongoDB to control how long idle server-side cursors are kept open before MongoDB automatically closes them.

---

MongoDB uses server-side cursors to iterate over query results. When a cursor sits idle for too long, MongoDB automatically closes it to free resources. The `cursorTimeoutMillis` parameter controls this timeout. Tuning it prevents both premature cursor expiration and resource leaks.

## Default Value

The default value for `cursorTimeoutMillis` is **600,000 milliseconds (10 minutes)**. After this period of inactivity, MongoDB closes the cursor and subsequent `getMore` operations return a `CursorNotFound` error.

## Setting cursorTimeoutMillis

**Via mongosh at runtime (no restart required):**

```javascript
db.adminCommand({
  setParameter: 1,
  cursorTimeoutMillis: 1800000  // 30 minutes
});
```

**Via mongod.conf:**

```yaml
setParameter:
  cursorTimeoutMillis: 1800000
```

**Via command line:**

```bash
mongod --setParameter cursorTimeoutMillis=1800000
```

## Verifying the Current Value

```javascript
db.adminCommand({
  getParameter: 1,
  cursorTimeoutMillis: 1
});
```

Expected output:

```text
{ cursorTimeoutMillis: 1800000, ok: 1 }
```

## When to Adjust cursorTimeoutMillis

**Increase the value when:**
- You have batch processing jobs that pause between fetches
- Reporting queries iterate large result sets with slow processing between rows
- Network latency causes delays in cursor consumption

**Decrease the value when:**
- You want faster cleanup of abandoned cursors to free memory
- Clients frequently create cursors but do not exhaust them

## Using No-Timeout Cursors for Long Operations

For long-running operations, instead of increasing the global timeout, use a no-timeout cursor:

```javascript
// Node.js with the MongoDB driver
const cursor = collection.find({}).addCursorFlag("noCursorTimeout", true);

for await (const doc of cursor) {
  // process each document
}

await cursor.close();
```

**Important:** Always explicitly close no-timeout cursors. Orphaned no-timeout cursors accumulate and exhaust server memory.

## Detecting Idle Cursors

Use `$currentOp` to list open cursors and identify idle ones:

```javascript
db.getSiblingDB("admin").aggregate([
  { $currentOp: { idleCursors: true } }
]);
```

Or query the `serverStatus` command to see cursor counts:

```javascript
db.adminCommand({ serverStatus: 1 }).metrics.cursor
```

Sample output:

```text
{
  timedOut: NumberLong(3),
  open: {
    noTimeout: NumberLong(0),
    pinned: NumberLong(0),
    total: NumberLong(5)
  }
}
```

A rising `timedOut` counter suggests cursors are expiring before being consumed - consider increasing `cursorTimeoutMillis` or optimizing client processing speed.

## Application-Level Handling

Always handle `CursorNotFound` errors gracefully:

```javascript
try {
  for await (const doc of cursor) {
    await processSlowly(doc);
  }
} catch (err) {
  if (err.code === 43) { // CursorNotFound
    console.error("Cursor expired - re-run the query");
  }
}
```

## Summary

`cursorTimeoutMillis` defaults to 10 minutes and controls when idle server-side cursors are closed. Increase it for slow batch consumers, or use no-timeout cursors for operations that truly need unlimited time. Always monitor cursor metrics via `serverStatus` and explicitly close no-timeout cursors to avoid memory leaks.
