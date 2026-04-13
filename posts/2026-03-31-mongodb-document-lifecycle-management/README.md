# How to Implement Document Lifecycle Management in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Document, Lifecycle, Schema, Aggregation

Description: Manage the full lifecycle of MongoDB documents from creation through archival and deletion using status fields, TTL indexes, and change streams.

---

## Overview

Document lifecycle management means tracking and controlling a document's state from the moment it is created until it is deleted or archived. In MongoDB, you can combine status fields, TTL indexes, change streams, and aggregation pipelines to build a robust lifecycle system without external orchestration tools.

## Defining a Lifecycle Schema

Add metadata fields to every document to track its current state and relevant timestamps.

```javascript
const lifecycleSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["status", "createdAt"],
      properties: {
        status: {
          bsonType: "string",
          enum: ["draft", "active", "suspended", "archived", "deleted"],
        },
        createdAt: { bsonType: "date" },
        activatedAt: { bsonType: ["date", "null"] },
        archivedAt: { bsonType: ["date", "null"] },
        expiresAt: { bsonType: ["date", "null"] },
        version: { bsonType: "int" },
      },
    },
  },
};

await db.createCollection("documents", lifecycleSchema);
```

## State Transition Helper

Encapsulate state transitions in a helper function that validates allowed transitions before updating.

```javascript
const TRANSITIONS = {
  draft: ["active", "deleted"],
  active: ["suspended", "archived", "deleted"],
  suspended: ["active", "archived", "deleted"],
  archived: ["deleted"],
  deleted: [],
};

async function transition(col, id, newStatus, extra = {}) {
  const { ObjectId } = require("mongodb");
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("Document not found");

  const allowed = TRANSITIONS[doc.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${doc.status} to ${newStatus}`);
  }

  const ts = new Date();
  const update = {
    $set: { status: newStatus, ...extra },
    $inc: { version: 1 },
  };
  if (newStatus === "active") update.$set.activatedAt = ts;
  if (newStatus === "archived") update.$set.archivedAt = ts;

  await col.updateOne({ _id: new ObjectId(id) }, update);
}
```

## Automatic Expiry with TTL Index

Create a TTL index on `expiresAt` to automatically remove documents after a scheduled time.

```javascript
await db.collection("documents").createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } }
);

// Set expiry when archiving
await transition(col, docId, "archived", {
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
});
```

## Auditing Transitions with Change Streams

Use change streams to record every state change in an audit log collection.

```javascript
const changeStream = db.collection("documents").watch(
  [{ $match: { "updateDescription.updatedFields.status": { $exists: true } } }],
  { fullDocument: "updateLookup", fullDocumentBeforeChange: "whenAvailable" }
);

changeStream.on("change", async (change) => {
  await db.collection("audit_log").insertOne({
    documentId: change.documentKey._id,
    fromStatus: change.fullDocumentBeforeChange?.status,
    toStatus: change.fullDocument.status,
    changedAt: new Date(),
    operationType: change.operationType,
  });
});
```

## Querying Documents by Lifecycle Stage

Use index-backed queries on `status` to retrieve documents at any lifecycle stage efficiently.

```javascript
await db.collection("documents").createIndex({ status: 1, createdAt: -1 });

// Fetch all active documents created in the last 30 days
const activeRecent = await db.collection("documents").find({
  status: "active",
  createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
}).sort({ createdAt: -1 }).toArray();
```

## Summary

MongoDB document lifecycle management combines a status-field schema, explicit transition guards, TTL indexes for automatic expiry, and change streams for auditing. Centralizing lifecycle logic in a helper function prevents invalid transitions while keeping the implementation decoupled from the rest of your application.
