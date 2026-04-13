# How to Build a Webhook Delivery Queue with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Webhook, Queue, Retry, Node.js

Description: Learn how to build a reliable webhook delivery queue in MongoDB with retry logic, exponential backoff, and delivery status tracking.

---

## Why Use MongoDB for a Webhook Queue

MongoDB's atomic `findOneAndUpdate` makes it well-suited for a job queue. You can implement at-least-once delivery with retry logic, status tracking, and exponential backoff without an external queue system.

## Queue Schema

Create a `webhook_events` collection with the following structure:

```javascript
db.createCollection("webhook_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["url", "payload", "status", "attempts", "nextRetryAt"],
      properties: {
        url: { bsonType: "string" },
        payload: { bsonType: "object" },
        status: { enum: ["pending", "processing", "delivered", "failed"] },
        attempts: { bsonType: "number" },
        maxAttempts: { bsonType: "number" },
        nextRetryAt: { bsonType: "date" },
        lastError: { bsonType: "string" }
      }
    }
  }
})
```

## Creating a Webhook Event

```javascript
db.webhook_events.insertOne({
  url: "https://example.com/webhook",
  payload: { event: "order.created", orderId: "123" },
  status: "pending",
  attempts: 0,
  maxAttempts: 5,
  nextRetryAt: new Date(),
  createdAt: new Date()
})
```

## Claiming and Delivering Events

Use `findOneAndUpdate` to atomically claim a pending event:

```javascript
const event = await db.collection("webhook_events").findOneAndUpdate(
  {
    status: "pending",
    nextRetryAt: { $lte: new Date() }
  },
  {
    $set: { status: "processing", claimedAt: new Date() }
  },
  {
    sort: { nextRetryAt: 1 },
    returnDocument: "after"
  }
);
```

## Handling Delivery Success and Failure

After attempting delivery, update the document:

```javascript
async function markDelivered(id) {
  await db.collection("webhook_events").updateOne(
    { _id: id },
    { $set: { status: "delivered", deliveredAt: new Date() } }
  );
}

async function markFailed(id, error, attempts, maxAttempts) {
  const backoffSeconds = Math.pow(2, attempts) * 30; // exponential backoff
  const nextRetry = new Date(Date.now() + backoffSeconds * 1000);
  const newStatus = attempts >= maxAttempts ? "failed" : "pending";

  await db.collection("webhook_events").updateOne(
    { _id: id },
    {
      $set: {
        status: newStatus,
        lastError: error.message,
        nextRetryAt: nextRetry
      },
      $inc: { attempts: 1 }
    }
  );
}
```

## Indexing for Performance

```javascript
db.webhook_events.createIndex(
  { status: 1, nextRetryAt: 1 },
  { partialFilterExpression: { status: "pending" } }
)
```

## Dead Letter Queue

Copy permanently failed events to a separate collection for investigation:

```javascript
db.webhook_events.aggregate([
  { $match: { status: "failed" } },
  { $merge: { into: "webhook_dead_letter", whenMatched: "replace", whenNotMatched: "insert" } }
])
```

## Summary

MongoDB provides all the building blocks for a reliable webhook delivery queue: atomic document updates for safe claiming, flexible schema for retry metadata, and partial indexes for efficient polling. Exponential backoff and a maximum attempt limit prevent overwhelming failing endpoints while ensuring eventual delivery.
