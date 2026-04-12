# How to Build a Webhook Delivery System with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Webhook, Queue, Retry, Event

Description: Learn how to build a reliable webhook delivery system with MongoDB, using a job queue collection with retry logic, exponential backoff, and delivery tracking.

---

A webhook delivery system must reliably deliver HTTP callbacks to external endpoints, handle transient failures with retries, and provide observability into delivery status. MongoDB's atomic update operations and TTL indexes make it a practical backing store for a webhook job queue.

## Designing the Webhook Subscription Schema

Store subscriber endpoints in a dedicated collection.

```javascript
db.webhook_subscriptions.insertOne({
  _id: "sub-001",
  targetUrl: "https://partner.example.com/hooks/events",
  secret: "sha256-hmac-secret",
  events: ["order.created", "order.shipped"],
  active: true,
  createdAt: new Date()
});
```

## Designing the Delivery Job Schema

Each delivery attempt is a separate document with retry metadata.

```javascript
db.webhook_deliveries.insertOne({
  subscriptionId: "sub-001",
  targetUrl: "https://partner.example.com/hooks/events",
  event: "order.created",
  payload: { orderId: "ord-999", total: 5999 },
  status: "pending",
  attempts: 0,
  maxAttempts: 5,
  nextRunAt: new Date(),
  lastError: null,
  createdAt: new Date()
});
```

## Claiming a Delivery Job

Use `findOneAndUpdate` with `$set` to atomically claim a job so that only one worker processes it at a time.

```javascript
const job = await db.collection("webhook_deliveries").findOneAndUpdate(
  {
    status: "pending",
    nextRunAt: { $lte: new Date() }
  },
  {
    $set: { status: "processing", claimedAt: new Date() }
  },
  { returnDocument: "after", sort: { nextRunAt: 1 } }
);
```

## Delivering the Webhook

Send the HTTP request and update the job status based on the result.

```javascript
async function deliver(job) {
  try {
    const response = await fetch(job.targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job.payload)
    });
    if (response.ok) {
      await db.collection("webhook_deliveries").updateOne(
        { _id: job._id },
        { $set: { status: "delivered", deliveredAt: new Date() } }
      );
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    await scheduleRetry(job, err.message);
  }
}
```

## Scheduling Retries with Exponential Backoff

On failure, increment the attempt count and calculate the next run time using exponential backoff.

```javascript
async function scheduleRetry(job, errorMessage) {
  const attempts = job.attempts + 1;
  const delaySec = Math.pow(2, attempts) * 30;  // 60s, 120s, 240s ...
  const nextRunAt = new Date(Date.now() + delaySec * 1000);
  const status = attempts >= job.maxAttempts ? "failed" : "pending";

  await db.collection("webhook_deliveries").updateOne(
    { _id: job._id },
    {
      $set: { status, nextRunAt, lastError: errorMessage },
      $inc: { attempts: 1 }
    }
  );
}
```

## Expiring Old Delivery Records

Use a TTL index to automatically clean up delivered and failed jobs after 30 days.

```javascript
db.webhook_deliveries.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }
);
```

## Summary

A MongoDB webhook delivery system uses a job queue collection with `findOneAndUpdate` for atomic job claiming, exponential backoff for retries, and a TTL index for automatic cleanup. The status field transitions from `pending` to `processing` to `delivered` or `failed`, giving you a complete audit trail of every delivery attempt without a separate message broker.
