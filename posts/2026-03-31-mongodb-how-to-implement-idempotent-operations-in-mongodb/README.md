# How to Implement Idempotent Operations in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Idempotency, Reliability, Distributed System, Transaction

Description: Implement idempotent operations in MongoDB to safely retry failed requests without creating duplicate data or performing operations multiple times.

---

## Overview

An idempotent operation produces the same result whether it is executed once or multiple times. In distributed systems, network failures and timeouts make retrying operations necessary. Without idempotency, retrying can cause duplicate orders, double charges, or multiple emails. MongoDB's conditional writes and idempotency keys are the key tools for building safe retry logic.

## The Problem

```javascript
// NOT idempotent - retrying creates duplicate orders
async function createOrder(userId, items, total) {
  const result = await db.collection("orders").insertOne({
    userId,
    items,
    total,
    status: "pending",
    createdAt: new Date()
  })
  return result.insertedId
}
// If this call times out and is retried, you get two orders!
```

## Pattern 1 - Idempotency Key

The client generates a unique key per operation. The server checks if the key was already processed before executing:

```javascript
// Idempotency keys collection
// {
//   key: "idem-uuid-abc123",
//   result: { orderId: "order-xyz" },
//   createdAt: ISODate("...")
// }

// TTL index - expire idempotency keys after 24 hours
db.idempotency_keys.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
)
// Unique index on key
db.idempotency_keys.createIndex({ key: 1 }, { unique: true })

async function createOrderIdempotent(db, idempotencyKey, userId, items, total) {
  // Check if this key was already used
  const existing = await db.collection("idempotency_keys").findOne({
    key: idempotencyKey
  })

  if (existing) {
    console.log("Duplicate request - returning cached result")
    return existing.result
  }

  // Execute the operation
  const orderResult = await db.collection("orders").insertOne({
    userId,
    items,
    total,
    status: "pending",
    idempotencyKey,
    createdAt: new Date()
  })

  const result = { orderId: orderResult.insertedId.toString() }

  // Store the idempotency key with the result
  try {
    await db.collection("idempotency_keys").insertOne({
      key: idempotencyKey,
      result,
      createdAt: new Date()
    })
  } catch (err) {
    if (err.code === 11000) {
      // Race condition - another request saved the key first
      const saved = await db.collection("idempotency_keys").findOne({ key: idempotencyKey })
      return saved.result
    }
    throw err
  }

  return result
}
```

### Usage from Client

```javascript
const { v4: uuidv4 } = require("uuid")

async function placeOrder(items) {
  const idempotencyKey = uuidv4()  // Store this for retry
  localStorage.setItem("pendingOrderKey", idempotencyKey)

  try {
    const result = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({ items })
    })
    localStorage.removeItem("pendingOrderKey")
    return result.json()
  } catch (err) {
    // On retry, use the same idempotencyKey
    console.log("Retrying with same idempotency key:", idempotencyKey)
    throw err
  }
}
```

## Pattern 2 - Upsert for Natural Idempotency

Use `updateOne` with `upsert: true` and a unique natural key:

```javascript
// Idempotent "ensure user exists" operation
async function ensureUser(db, externalId, email, name) {
  const result = await db.collection("users").updateOne(
    { externalId },                   // match by natural unique key
    {
      $setOnInsert: {                 // only set on first insert
        externalId,
        email,
        name,
        createdAt: new Date()
      }
    },
    { upsert: true }
  )

  if (result.upsertedId) {
    console.log("Created new user:", result.upsertedId)
  } else {
    console.log("User already exists - no action taken")
  }
}
```

## Pattern 3 - Conditional Update with State Machine

Prevent double-processing by only allowing transitions from a specific state:

```javascript
// Order state machine: pending -> processing -> shipped -> delivered
async function processOrder(db, orderId) {
  const result = await db.collection("orders").updateOne(
    {
      _id: new ObjectId(orderId),
      status: "pending"              // Only update if still "pending"
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: new Date()
      }
    }
  )

  if (result.modifiedCount === 0) {
    // Either order doesn't exist or was already processed
    const order = await db.collection("orders").findOne({
      _id: new ObjectId(orderId)
    })

    if (!order) throw new Error("Order not found")

    if (order.status !== "pending") {
      console.log(`Order already in state: ${order.status} - idempotent no-op`)
      return order
    }
  }

  // Proceed with processing logic
  await doProcessingWork(orderId)
  return db.collection("orders").findOne({ _id: new ObjectId(orderId) })
}
```

## Pattern 4 - Deduplication on Insert

Use a unique index to prevent duplicate inserts:

```javascript
// Create unique index on business key
db.payments.createIndex(
  { transactionId: 1 },
  { unique: true }
)

async function recordPayment(db, transactionId, amount, userId) {
  try {
    const result = await db.collection("payments").insertOne({
      transactionId,
      amount,
      userId,
      status: "completed",
      createdAt: new Date()
    })
    return { created: true, paymentId: result.insertedId }
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key - payment already recorded
      const existing = await db.collection("payments").findOne({ transactionId })
      return { created: false, paymentId: existing._id }
    }
    throw err
  }
}
```

## Pattern 5 - Idempotent Atomic Increment

When incrementing counters, include a processed-events set to avoid double counting:

```javascript
async function trackEvent(db, userId, eventId, eventType) {
  const result = await db.collection("user_stats").updateOne(
    {
      userId,
      processedEvents: { $ne: eventId }  // Only if not already counted
    },
    {
      $inc: { [`counts.${eventType}`]: 1 },
      $push: { processedEvents: { $each: [eventId], $slice: -1000 } },
      $setOnInsert: { userId, createdAt: new Date() }
    },
    { upsert: true }
  )

  if (result.modifiedCount === 0 && !result.upsertedId) {
    console.log("Event already tracked - idempotent no-op")
  }
}
```

## Express Middleware for Idempotency Keys

```javascript
function idempotencyMiddleware(db) {
  return async (req, res, next) => {
    const key = req.headers["idempotency-key"]
    if (!key || req.method !== "POST") return next()

    const cached = await db.collection("idempotency_keys").findOne({ key })
    if (cached) {
      return res.status(cached.statusCode).json(cached.body)
    }

    // Intercept the response to cache it
    const originalJson = res.json.bind(res)
    res.json = function(body) {
      db.collection("idempotency_keys").insertOne({
        key,
        statusCode: res.statusCode,
        body,
        createdAt: new Date()
      }).catch(() => {})  // Non-blocking
      return originalJson(body)
    }

    next()
  }
}

app.use(idempotencyMiddleware(db))
```

## Summary

Implementing idempotent operations in MongoDB relies on three core patterns: storing idempotency keys (with a unique index and TTL) to cache results of processed requests, using conditional updates and upserts tied to natural unique keys to prevent duplicate inserts, and designing state machines where transitions only occur from a specific state. Together these patterns allow clients to safely retry operations after network failures without risking duplicate orders, payments, or other side effects.
