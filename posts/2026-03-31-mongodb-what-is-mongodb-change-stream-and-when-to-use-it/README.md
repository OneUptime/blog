# What Is MongoDB Change Stream and When to Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Real-Time, Event-Driven, Replica Set

Description: Learn what MongoDB Change Streams are, how they enable real-time data change notifications, and when to use them in event-driven architectures.

---

## What Is a Change Stream

A change stream is a real-time notification stream that notifies your application of changes to MongoDB data. It uses the oplog as its source and provides a human-friendly API for watching inserts, updates, deletes, and schema changes without polling.

## Requirements

Change streams require:
- MongoDB 3.6+ (collections), 4.0+ (databases), 4.0+ (entire deployment)
- Replica set or sharded cluster (not standalone)

## Basic Change Stream Usage

```javascript
// Watch a collection for all changes
const changeStream = db.collection("orders").watch()

changeStream.on("change", (change) => {
  console.log("Change detected:", change.operationType)
  console.log("Document:", change.fullDocument)
})

changeStream.on("error", (err) => {
  console.error("Change stream error:", err)
})
```

## Change Event Types

```javascript
// Insert event
{
  operationType: "insert",
  documentKey: { _id: ObjectId("...") },
  fullDocument: { _id: ..., orderId: "123", status: "pending" },
  ns: { db: "myapp", coll: "orders" }
}

// Update event
{
  operationType: "update",
  documentKey: { _id: ObjectId("...") },
  updateDescription: {
    updatedFields: { status: "shipped" },
    removedFields: []
  }
}

// Delete event
{
  operationType: "delete",
  documentKey: { _id: ObjectId("...") }
}
```

## Filtering Change Events with Pipelines

Apply an aggregation pipeline to filter events before they reach your application:

```javascript
const pipeline = [
  {
    $match: {
      operationType: { $in: ["insert", "update"] },
      "fullDocument.status": "shipped"
    }
  }
]

const changeStream = db.collection("orders").watch(pipeline, {
  fullDocument: "updateLookup"  // include full document on updates
})
```

## Resuming After Disconnection

Use resume tokens to pick up where you left off:

```javascript
let resumeToken = null

const changeStream = db.collection("orders").watch([], {
  resumeAfter: resumeToken
})

changeStream.on("change", (change) => {
  resumeToken = change._id  // store this token persistently
  processChange(change)
})
```

## Common Use Cases

```javascript
// 1. Invalidate cache when data changes
const cacheInvalidator = db.collection("products").watch([
  { $match: { operationType: { $in: ["insert", "update", "delete"] } } }
])
cacheInvalidator.on("change", (change) => {
  cache.delete(`product:${change.documentKey._id}`)
})

// 2. Sync to Elasticsearch
const searchSync = db.collection("articles").watch([], { fullDocument: "updateLookup" })
searchSync.on("change", async (change) => {
  if (change.operationType === "insert" || change.operationType === "update") {
    await esClient.index({ index: "articles", id: change.documentKey._id, body: change.fullDocument })
  } else if (change.operationType === "delete") {
    await esClient.delete({ index: "articles", id: change.documentKey._id })
  }
})

// 3. Trigger notifications
const notifier = db.collection("orders").watch([
  { $match: { "updateDescription.updatedFields.status": "delivered" } }
], { fullDocument: "updateLookup" })
notifier.on("change", async (change) => {
  await sendDeliveryNotification(change.fullDocument.userId)
})
```

## When to Use Change Streams vs Polling

Use change streams when:
- You need real-time (sub-second) reactions to data changes
- You are building event-driven microservices or CQRS patterns
- You need to sync MongoDB to another system (search index, cache, data warehouse)

Use polling when:
- Your application is simple and eventually consistent is acceptable
- Change streams' replica set requirement is not met

## Summary

MongoDB Change Streams provide a real-time, resumable stream of data change events backed by the oplog. Filter events using aggregation pipelines, use `resumeAfter` to survive disconnections, and request `updateLookup` to get full documents on updates. They are ideal for cache invalidation, cross-system sync, and event-driven notification workflows.
