# How to Track Document Creation and Modification History in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Audit, Change Stream, History, Document

Description: Record every create and update event on MongoDB documents using change streams and versioned history collections for full audit trails.

---

## Overview

Tracking when documents were created and modified - along with what changed - is essential for compliance, debugging, and user-facing activity feeds. MongoDB provides change streams for real-time event capture and supports versioned document patterns for storing complete edit histories.

## Automatic Timestamps with Schema Validation

Enforce `createdAt` and `updatedAt` fields using schema validation so every document carries timestamps from the start.

```javascript
await db.createCollection("articles", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["createdAt", "updatedAt"],
      properties: {
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
        createdBy: { bsonType: "string" },
        updatedBy: { bsonType: "string" },
      },
    },
  },
});
```

## Middleware Layer for Automatic Tracking

In a Node.js application, add a wrapper that stamps every write with the current time and user.

```javascript
class TrackedCollection {
  constructor(db, name) {
    this.col = db.collection(name);
  }

  async insertOne(doc, userId) {
    const now = new Date();
    return this.col.insertOne({
      ...doc,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      __v: 1,
    });
  }

  async updateOne(filter, update, userId) {
    const now = new Date();
    const stamped = {
      ...update,
      $set: { ...update.$set, updatedAt: now, updatedBy: userId },
      $inc: { ...update.$inc, __v: 1 },
    };
    return this.col.findOneAndUpdate(filter, stamped, {
      returnDocument: "before",
    });
  }
}
```

## Storing Full Modification History with Change Streams

Capture every update event and write a snapshot of the previous document to a history collection.

First, enable pre- and post-images on the collection so change streams can access the document state before each change. This requires MongoDB 6.0 or later.

```javascript
await db.command({
  collMod: "articles",
  changeStreamPreAndPostImages: { enabled: true },
});
```

Then open a change stream that records every write to a history collection.

```javascript
const { MongoClient } = require("mongodb");

async function startHistoryTracker(db, collectionName) {
  const collection = db.collection(collectionName);
  const history = db.collection(`${collectionName}_history`);

  const stream = collection.watch(
    [{ $match: { operationType: { $in: ["insert", "update", "replace"] } } }],
    { fullDocumentBeforeChange: "whenAvailable", fullDocument: "updateLookup" }
  );

  stream.on("change", async (event) => {
    await history.insertOne({
      documentId: event.documentKey._id,
      operationType: event.operationType,
      before: event.fullDocumentBeforeChange || null,
      after: event.fullDocument,
      changedFields: event.updateDescription?.updatedFields || null,
      removedFields: event.updateDescription?.removedFields || null,
      recordedAt: new Date(),
    });
  });

  return stream;
}
```

## Querying the Modification History

Retrieve the full edit history for a specific document, sorted from newest to oldest.

```javascript
async function getHistory(db, collectionName, documentId) {
  const { ObjectId } = require("mongodb");
  return db
    .collection(`${collectionName}_history`)
    .find({ documentId: new ObjectId(documentId) })
    .sort({ recordedAt: -1 })
    .toArray();
}
```

## Diffing Consecutive Versions

Show what changed between two consecutive versions.

```javascript
function diffVersions(before, after) {
  const changes = {};
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  for (const key of allKeys) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
      changes[key] = { from: before?.[key], to: after?.[key] };
    }
  }
  return changes;
}
```

## Index on History Collection

```javascript
await db.collection("articles_history").createIndex(
  { documentId: 1, recordedAt: -1 },
  { name: "idx_document_history" }
);
```

## Summary

Tracking document history in MongoDB combines schema-enforced timestamp fields, a middleware wrapper that stamps every write, and a change stream listener that copies pre-change snapshots to a history collection. This gives you a complete audit trail with field-level diffs, queryable by document ID and timestamp.
