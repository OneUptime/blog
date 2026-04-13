# How to Use Pre-Image and Post-Image with Change Streams in MongoDB 6.0+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Pre-Image, Post-Image, MongoDB 6.0

Description: Use MongoDB 6.0+ pre-image and post-image change stream features to access the full document state before and after every update or delete operation.

---

## What Are Pre-Images and Post-Images?

Before MongoDB 6.0, change stream update events only contained the fields that changed (`updateDescription`), not the full document. MongoDB 6.0 introduced:

- **Pre-Image**: The full document as it existed BEFORE the change
- **Post-Image**: The full document as it exists AFTER the change

This is critical for:
- Audit logs that need before/after snapshots
- CDC (Change Data Capture) pipelines syncing to data warehouses
- Undo/redo functionality
- Detecting exactly what changed on any operation

## Prerequisites

- MongoDB 6.0+ (replica set or sharded cluster)
- Collection-level configuration to enable pre/post image storage

## Step 1: Enable Pre/Post Images on a Collection

Pre/post image storage must be enabled per collection:

```javascript
// Enable both pre-image and post-image on an existing collection
db.runCommand({
  collMod: "orders",
  changeStreamPreAndPostImages: { enabled: true }
})
```

Or when creating a new collection:

```javascript
db.createCollection("orders", {
  changeStreamPreAndPostImages: { enabled: true }
})
```

Verify it's enabled:

```javascript
db.getCollectionInfos({ name: "orders" })[0].options
// { changeStreamPreAndPostImages: { enabled: true } }
```

## Step 2: Request Pre-Image in the Change Stream

```javascript
const changeStream = collection.watch([], {
  fullDocumentBeforeChange: 'whenAvailable'
  // Options: 'whenAvailable', 'required', 'off' (default)
});

changeStream.on('change', (change) => {
  if (change.fullDocumentBeforeChange) {
    console.log('BEFORE:', change.fullDocumentBeforeChange);
  }
  console.log('Operation:', change.operationType);
});
```

`'required'` throws an error if the pre-image is not available. `'whenAvailable'` returns `null` if unavailable.

## Step 3: Request Post-Image in the Change Stream

```javascript
const changeStream = collection.watch([], {
  fullDocument: 'required'
  // 'required', 'updateLookup', 'whenAvailable', 'default' (default)
});
```

`fullDocument: 'required'` uses the stored post-image (stored on the server at write time). This is more consistent than `'updateLookup'` which does a separate read.

## Step 4: Use Both Pre and Post Images Together

```javascript
const changeStream = collection.watch([], {
  fullDocumentBeforeChange: 'whenAvailable',
  fullDocument: 'whenAvailable'
});

changeStream.on('change', (change) => {
  const { operationType, fullDocumentBeforeChange, fullDocument } = change;

  if (operationType === 'update') {
    console.log('UPDATE on order', change.documentKey._id);
    console.log('BEFORE:', JSON.stringify(fullDocumentBeforeChange));
    console.log('AFTER:', JSON.stringify(fullDocument));

    // Compute diff
    const changedFields = Object.keys(change.updateDescription.updatedFields);
    changedFields.forEach(field => {
      const before = fullDocumentBeforeChange?.[field];
      const after = fullDocument?.[field];
      console.log(`  ${field}: ${before} -> ${after}`);
    });
  }

  if (operationType === 'delete') {
    // Post-image not available for deletes (document no longer exists)
    // Pre-image gives you what was deleted
    console.log('DELETED document:', JSON.stringify(fullDocumentBeforeChange));
  }
});
```

## Step 5: Build an Audit Log

```javascript
const auditCollection = db.collection('audit_log');

const changeStream = collection.watch([], {
  fullDocumentBeforeChange: 'whenAvailable',
  fullDocument: 'whenAvailable'
});

changeStream.on('change', async (change) => {
  const auditEntry = {
    timestamp: change.clusterTime,
    collection: change.ns.coll,
    operationType: change.operationType,
    documentId: change.documentKey._id,
    before: change.fullDocumentBeforeChange || null,
    after: change.fullDocument || null,
    updatedFields: change.updateDescription?.updatedFields || null
  };

  await auditCollection.insertOne(auditEntry);
});
```

## Step 6: Pre-Image Storage and Expiry

Pre/post images are stored in the `config.system.preimages` collection with a configurable TTL:

```javascript
// Set expiry for pre-images (in seconds)
db.adminCommand({
  setClusterParameter: {
    changeStreamOptions: {
      preAndPostImages: {
        expireAfterSeconds: 3600  // 1 hour
      }
    }
  }
})
```

Pre-images are cleaned up automatically after the TTL expires. The default is "off" (no automatic expiry - manual cleanup required).

Monitor pre-image storage size:

```javascript
db.getSiblingDB("config").system.preimages.stats()
```

## Availability Matrix

| Operation | Pre-Image Available | Post-Image Available |
|---|---|---|
| insert | No | Yes |
| update | Yes | Yes |
| replace | Yes | Yes |
| delete | Yes | No |

## Summary

MongoDB 6.0+ pre-image and post-image support gives change streams access to the complete document state before and after every write operation. Enable the feature per collection with `changeStreamPreAndPostImages`, then request `fullDocumentBeforeChange` and/or `fullDocument: 'whenAvailable'` when opening the stream. Configure pre-image TTL to control storage growth, and use both together to build precise audit logs, CDC pipelines, or diff-based change handlers.
