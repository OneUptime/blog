# How to Insert Documents with Current Timestamps in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Timestamp, Insert, Date, Schema, Document

Description: Learn how to insert documents with current timestamps in MongoDB using new Date(), ISODate(), and the $$NOW system variable in aggregation pipelines.

---

## Introduction

Timestamps are a fundamental part of most MongoDB document schemas. Recording when documents are created and last updated enables auditing, sorting, TTL expiry, and time-series analysis. MongoDB provides several ways to insert the current timestamp depending on whether you are inserting from application code, mongosh scripts, or aggregation pipelines.

## Using new Date() in mongosh

In mongosh and JavaScript drivers, `new Date()` returns the current UTC time as a BSON Date:

```javascript
db.orders.insertOne({
  orderId: "ORD-001",
  status: "new",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

## Using ISODate() in mongosh

`ISODate()` without arguments returns the current UTC time and is equivalent to `new Date()` in mongosh:

```javascript
db.events.insertOne({
  type: "user_login",
  userId: "usr-123",
  occurredAt: ISODate()
});
```

## Inserting with Timestamps in Node.js

```javascript
const { MongoClient } = require("mongodb");
const client = new MongoClient("mongodb://localhost:27017");
await client.connect();

const now = new Date();
await client.db("mydb").collection("orders").insertOne({
  orderId: "ORD-002",
  status: "pending",
  amount: 99.99,
  createdAt: now,
  updatedAt: now
});
```

## Using $$NOW in Aggregation Pipelines

The `$$NOW` system variable returns the current date within an aggregation pipeline. It returns the same value across the entire pipeline execution:

```javascript
db.orders.aggregate([
  { $match: { status: "pending" } },
  {
    $addFields: {
      processedAt: "$$NOW",
      ageMs: { $subtract: ["$$NOW", "$createdAt"] }
    }
  },
  {
    $merge: {
      into: "orders",
      on: "_id",
      whenMatched: "merge"
    }
  }
]);
```

## Adding createdAt and updatedAt Automatically

A common pattern is to set both fields on insert and only update `updatedAt` on modifications:

```javascript
// Insert with both timestamps
async function insertWithTimestamps(collection, doc) {
  const now = new Date();
  return collection.insertOne({
    ...doc,
    createdAt: now,
    updatedAt: now
  });
}

// Update only updatedAt
async function updateWithTimestamp(collection, filter, update) {
  return collection.updateOne(filter, {
    ...update,
    $set: { ...update.$set, updatedAt: new Date() }
  });
}
```

## Using TTL Indexes with Timestamps

Automatically expire documents based on their timestamp:

```javascript
// Expire session documents 24 hours after creation
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 }
);

db.sessions.insertOne({
  token: "sess-abc123",
  userId: "usr-456",
  createdAt: new Date()
});
```

## Summary

MongoDB provides multiple ways to insert current timestamps: `new Date()` in mongosh and JavaScript drivers, `ISODate()` in mongosh, and `$$NOW` in aggregation pipelines. The standard pattern is to set both `createdAt` and `updatedAt` on insert, then update only `updatedAt` on modifications. Combining timestamp fields with TTL indexes automates document expiry for sessions, logs, and temporary data.
