# What Is a MongoDB Cursor and How It Manages Results

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Cursor, Query, Pagination, Performance

Description: Learn what a MongoDB cursor is, how it fetches results in batches, and how to use cursor methods to paginate, sort, and iterate over large result sets.

---

## What Is a Cursor

When you call `find()` in MongoDB, it returns a cursor - a pointer to the result set on the server. The cursor does not immediately transfer all matching documents. Instead, it fetches them in batches as you iterate, reducing memory usage for large queries.

## How Cursor Batching Works

By default, the first batch contains up to 101 documents or 16MB of data (whichever comes first). Subsequent batches contain up to 16MB each.

```javascript
// The cursor is returned immediately; data is fetched lazily
const cursor = db.orders.find({ status: "pending" })

// Documents are fetched in batches as you iterate
while (cursor.hasNext()) {
  const doc = cursor.next()
  processOrder(doc)
}
```

## Cursor Lifecycle

A cursor lives on the server and consumes resources. It automatically closes when:
- All documents are exhausted
- The cursor is explicitly closed
- After 10 minutes of inactivity (idle cursor timeout)

## Common Cursor Methods

```javascript
// Sort results
db.orders.find().sort({ createdAt: -1 })

// Limit results
db.orders.find().limit(20)

// Skip results (for offset pagination)
db.orders.find().sort({ _id: 1 }).skip(100).limit(20)

// Return only specific fields
db.orders.find({}, { orderId: 1, total: 1, _id: 0 })

// Count documents matching filter
db.orders.countDocuments({ status: "pending" })
```

## Batch Size Control

```javascript
// Set custom batch size
const cursor = db.orders.find({ status: "completed" }).batchSize(500)

// Exhaust all documents in one call (dangerous for large collections)
const allDocs = db.orders.find().toArray()
```

## No-Timeout Cursors

For long-running operations, disable cursor timeout:

```javascript
const cursor = db.reports.find({ year: 2025 }).addOption(
  DBQuery.Option.noTimeout  // mongosh
)

// Node.js driver
const cursor = db.collection("reports").find({ year: 2025 }, {
  noCursorTimeout: true
})
```

Always close no-timeout cursors explicitly:

```javascript
await cursor.close()
```

## Efficient Cursor Iteration in Node.js

```javascript
const cursor = db.collection("events").find({
  timestamp: { $gte: new Date("2026-01-01") }
}).sort({ timestamp: 1 })

for await (const doc of cursor) {
  await processEvent(doc)
}
// Cursor automatically closed after for-await loop
```

## Cursor-Based Pagination vs Skip/Limit

Skip/limit becomes slow for deep pages because MongoDB must scan all skipped documents. Use cursor-based pagination instead:

```javascript
// Page 1
const page1 = await db.collection("orders").find({})
  .sort({ _id: 1 })
  .limit(20)
  .toArray()

// Next page: use last _id from previous page
const lastId = page1[page1.length - 1]._id

const page2 = await db.collection("orders").find({
  _id: { $gt: lastId }
}).sort({ _id: 1 }).limit(20).toArray()
```

## Summary

A MongoDB cursor is a lazy pointer to a query result set that fetches documents in batches. Use cursor methods like `sort()`, `limit()`, `skip()`, and `project()` to shape results. For large result sets, iterate with `for await` or explicit `hasNext()`/`next()` calls rather than `toArray()`. Prefer cursor-based pagination over skip/limit for performance at scale.
