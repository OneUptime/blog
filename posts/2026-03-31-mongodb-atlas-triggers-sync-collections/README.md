# How to Sync Data Between Collections with Atlas Triggers in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Triggers, Data Synchronization

Description: Use MongoDB Atlas database triggers to automatically synchronize data between collections, maintaining denormalized copies or derived fields in real time.

---

MongoDB's document model often requires denormalization - storing the same data in multiple places for query performance. Atlas Database Triggers maintain these copies automatically by reacting to changes in the source collection.

## Use Case: Denormalized Author Name in Posts

When a user updates their display name, all their posts should reflect the change. A trigger on the `users` collection propagates updates to `posts`.

## Trigger Configuration

```json
{
  "name": "sync-author-name-to-posts",
  "type": "DATABASE",
  "config": {
    "operation_types": ["UPDATE"],
    "collection": "users",
    "database": "blog",
    "service_name": "mongodb-atlas",
    "full_document": true,
    "full_document_before_change": false
  },
  "function_name": "syncAuthorNameToPosts"
}
```

## Sync Function: Update Posts When User Name Changes

```javascript
// Function: syncAuthorNameToPosts
exports = async function(changeEvent) {
  // Only proceed if displayName was updated
  const updatedFields = changeEvent.updateDescription?.updatedFields || {};
  if (!("displayName" in updatedFields) && !("avatarUrl" in updatedFields)) {
    return; // No relevant fields changed
  }

  const userId = changeEvent.documentKey._id;
  const user = changeEvent.fullDocument;

  const db = context.services.get("mongodb-atlas").db("blog");

  const setFields = {};
  if ("displayName" in updatedFields) {
    setFields["author.displayName"] = user.displayName;
  }
  if ("avatarUrl" in updatedFields) {
    setFields["author.avatarUrl"] = user.avatarUrl;
  }

  const result = await db.collection("posts").updateMany(
    { "author.userId": userId },
    { $set: setFields }
  );

  console.log(`Updated ${result.modifiedCount} posts for user ${userId}`);
};
```

## Use Case: Maintaining an Aggregate Summary Collection

Keep a real-time `orderSummaries` collection updated whenever an order is inserted or updated:

```javascript
// Function: upsertOrderSummary
exports = async function(changeEvent) {
  const { operationType, documentKey, fullDocument } = changeEvent;
  const db = context.services.get("mongodb-atlas").db("production");

  if (operationType === "delete") {
    // Remove the summary when the order is deleted
    await db.collection("orderSummaries").deleteOne({ orderId: documentKey._id });
    return;
  }

  const order = fullDocument;

  const summary = {
    orderId: order._id,
    customerId: order.customerId,
    status: order.status,
    itemCount: order.items?.length || 0,
    total: order.items?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0,
    lastUpdatedAt: new Date()
  };

  await db.collection("orderSummaries").updateOne(
    { orderId: order._id },
    { $set: summary },
    { upsert: true }
  );
};
```

## Use Case: Cross-Database Sync

Sync documents from a production database to a reporting database:

```javascript
exports = async function(changeEvent) {
  const { operationType, documentKey, fullDocument } = changeEvent;
  const reportingDb = context.services.get("mongodb-atlas").db("reporting");

  if (operationType === "delete") {
    await reportingDb.collection("events_copy").deleteOne({ _id: documentKey._id });
    return;
  }

  // Strip sensitive fields before copying
  const { internalNotes, rawPayload, ...publicFields } = fullDocument;

  await reportingDb.collection("events_copy").replaceOne(
    { _id: fullDocument._id },
    { ...publicFields, syncedAt: new Date() },
    { upsert: true }
  );
};
```

## Avoiding Infinite Trigger Loops

If trigger A watches collection X and updates collection Y, and trigger B watches collection Y and updates collection X, you create an infinite loop. Break the cycle by:

1. Only updating when relevant fields actually changed
2. Adding a `_syncSource` flag to updates and skipping documents with that flag

```javascript
// Skip documents updated by the sync trigger itself
if (changeEvent.fullDocument?._syncSource === "trigger") {
  return;
}

await targetCollection.updateOne(
  { _id: sourceDoc._id },
  { $set: { ...syncedFields, _syncSource: "trigger" } }
);
```

## Summary

Atlas Database Triggers maintain denormalized data copies by reacting to changes in source collections. Use `updateDescription.updatedFields` to check which fields changed before propagating updates. Upsert into summary collections for aggregate derived data. Guard against trigger loops by checking a sync flag or only reacting to specific field changes.
