# How to Use $changeStream in MongoDB Aggregation Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Real-Time, Event Driven, Aggregation, NoSQL

Description: Learn how to use MongoDB change streams with aggregation pipeline filters to watch for specific document changes in real time across collections and databases.

---

## What Are Change Streams?

Change streams allow applications to subscribe to real-time change notifications for collections, databases, or entire deployments. They are built on MongoDB's oplog and provide a reliable, resumable stream of change events.

Change streams require a MongoDB replica set or sharded cluster - they do not work on standalone deployments.

## Opening a Basic Change Stream

```javascript
// Watch all changes on a collection
const changeStream = db.orders.watch()

changeStream.on("change", (change) => {
  console.log("Change detected:", JSON.stringify(change, null, 2))
})
```

## Change Event Structure

```javascript
{
  _id: { /* resume token */ },
  operationType: "insert" | "update" | "replace" | "delete" | "drop" | "rename",
  fullDocument: { /* the document after change */ },
  documentKey: { _id: ObjectId("...") },
  ns: { db: "mydb", coll: "orders" },
  updateDescription: {
    updatedFields: { status: "shipped" },
    removedFields: []
  },
  clusterTime: Timestamp,
  wallTime: ISODate("...")
}
```

## Filtering with Aggregation Pipelines

Pass a pipeline to filter which change events you receive:

```javascript
// Only watch for inserts
const insertStream = db.orders.watch([
  { $match: { operationType: "insert" } }
])
```

```javascript
// Watch for status field updates only
const statusStream = db.orders.watch([
  {
    $match: {
      operationType: "update",
      "updateDescription.updatedFields.status": { $exists: true }
    }
  }
])
```

## Watching Specific Field Changes

```javascript
// Alert when order status changes to "cancelled"
const cancelStream = db.orders.watch(
  [
    {
      $match: {
        operationType: "update",
        "fullDocument.status": "cancelled"
      }
    }
  ],
  { fullDocument: "updateLookup" }
)
```

Note: For update events, `fullDocument` is not included by default. You must enable `fullDocument: "updateLookup"` to access it in your pipeline filters.

## Full Document Lookup

By default, update events only include the changed fields. To include the complete post-update document:

```javascript
const stream = db.orders.watch(
  [{ $match: { operationType: "update" } }],
  { fullDocument: "updateLookup" }
)

stream.on("change", (event) => {
  // event.fullDocument contains the full document after update
  processOrderUpdate(event.fullDocument)
})
```

## Resuming After Disconnection

Change streams provide resume tokens to restart from a specific point:

```javascript
let resumeToken = null

const stream = db.orders.watch([], {
  resumeAfter: resumeToken
})

stream.on("change", (event) => {
  resumeToken = event._id  // save token for resumption
  processChange(event)
})

stream.on("error", async (err) => {
  // On reconnect, resume from last processed event
  const newStream = db.orders.watch([], {
    resumeAfter: resumeToken
  })
})
```

## Watching a Full Database

Watch all collections in a database:

```javascript
const dbStream = db.watch([
  { $match: { "ns.coll": { $in: ["orders", "inventory", "customers"] } } }
])
```

## Watching the Entire Deployment

```javascript
const client = new MongoClient(uri)
const deploymentStream = client.watch([
  { $match: { operationType: { $in: ["insert", "update"] } } }
])
```

## Practical Use Case - Real-Time Notifications

```javascript
async function watchHighValueOrders() {
  const stream = db.orders.watch(
    [
      {
        $match: {
          operationType: "insert",
          "fullDocument.total": { $gte: 1000 }
        }
      }
    ],
    { fullDocument: "updateLookup" }
  )

  for await (const event of stream) {
    await notificationService.send({
      type: "high_value_order",
      orderId: event.fullDocument._id,
      total: event.fullDocument.total,
      customer: event.fullDocument.customerId
    })
  }
}
```

## Practical Use Case - Cache Invalidation

```javascript
const cache = new Map()

const stream = db.products.watch([
  { $match: { operationType: { $in: ["update", "replace", "delete"] } } }
])

stream.on("change", (event) => {
  const productId = event.documentKey._id.toString()
  cache.delete(productId)
  console.log(`Cache invalidated for product: ${productId}`)
})
```

## Pipeline Restrictions

Change stream pipelines support only these aggregation stages:
- `$match`
- `$project`
- `$addFields`
- `$set`
- `$unset`
- `$redact`
- `$replaceRoot`
- `$replaceWith`

Other stages like `$group`, `$lookup`, and `$sort` are not supported in change stream pipelines.

## Summary

MongoDB change streams provide a reliable, resumable mechanism for real-time event processing. By combining them with aggregation pipeline filters, you can subscribe to precisely the changes you care about - specific operation types, fields, or value conditions. They are ideal for cache invalidation, event-driven architectures, real-time notifications, and cross-service data synchronization.
