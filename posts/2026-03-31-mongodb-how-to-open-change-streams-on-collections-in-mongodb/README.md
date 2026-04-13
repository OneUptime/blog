# How to Open Change Streams on Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Real-Time, Node.js, Event

Description: Learn how to open and consume MongoDB change streams on collections to react to inserts, updates, and deletes in real time.

---

## What Are Change Streams?

Change streams allow applications to subscribe to real-time notifications of data changes in a MongoDB collection, database, or deployment. They use the replication oplog internally and provide a reliable, ordered stream of change events.

Change streams require:
- MongoDB 3.6+ with replica set or sharded cluster
- Collection-level streams (MongoDB 3.6+): any collection
- Database-level streams (MongoDB 4.0+): all collections in a DB
- Deployment-level streams (MongoDB 4.0+): all changes across all databases

## Basic Change Stream on a Collection

```javascript
const { MongoClient } = require('mongodb');

async function watchCollection() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const collection = client.db('appdb').collection('orders');

  // Open a change stream
  const changeStream = collection.watch();

  // Listen for change events
  changeStream.on('change', (change) => {
    console.log('Change detected:', JSON.stringify(change, null, 2));
  });

  // Handle errors
  changeStream.on('error', (err) => {
    console.error('Change stream error:', err);
  });
}

watchCollection();
```

## Change Event Structure

Each change event has this structure:

```json
{
  "_id": { "_data": "..." },
  "operationType": "insert",
  "clusterTime": { "$timestamp": { "t": 1704067200, "i": 1 } },
  "ns": { "db": "appdb", "coll": "orders" },
  "documentKey": { "_id": { "$oid": "..." } },
  "fullDocument": {
    "_id": { "$oid": "..." },
    "customerId": "C001",
    "total": 99.99,
    "status": "pending"
  }
}
```

## Operation Types

Change streams emit events for these operations:

| operationType | Description |
|---|---|
| `insert` | A new document was inserted |
| `update` | A document was updated |
| `replace` | A document was replaced |
| `delete` | A document was deleted |
| `drop` | The collection was dropped |
| `rename` | The collection was renamed |
| `dropDatabase` | The database was dropped |
| `invalidate` | The stream was invalidated |

## Handling Specific Operation Types

```javascript
changeStream.on('change', (change) => {
  switch (change.operationType) {
    case 'insert':
      console.log('New document:', change.fullDocument);
      handleNewOrder(change.fullDocument);
      break;

    case 'update':
      console.log('Updated fields:', change.updateDescription.updatedFields);
      console.log('Removed fields:', change.updateDescription.removedFields);
      handleOrderUpdate(change.documentKey._id, change.updateDescription);
      break;

    case 'delete':
      console.log('Deleted document ID:', change.documentKey._id);
      handleOrderDeletion(change.documentKey._id);
      break;

    case 'invalidate':
      console.log('Stream invalidated, reconnecting...');
      changeStream.close();
      watchCollection(); // Restart
      break;
  }
});
```

## Request Full Document on Updates

By default, update events only include the `updateDescription` (which fields changed). To get the full document:

```javascript
const changeStream = collection.watch([], {
  fullDocument: 'updateLookup'
});

changeStream.on('change', (change) => {
  if (change.operationType === 'update') {
    // change.fullDocument now contains the complete post-update document
    console.log('Full updated document:', change.fullDocument);
  }
});
```

Note: `updateLookup` does an extra read and has a small latency/consistency trade-off.

## Watch a Database (All Collections)

```javascript
const db = client.db('appdb');
const dbStream = db.watch();

dbStream.on('change', (change) => {
  console.log(`Change in ${change.ns.coll}:`, change.operationType);
});
```

## Watch the Entire Deployment

```javascript
const deploymentStream = client.watch();

deploymentStream.on('change', (change) => {
  const { db, coll } = change.ns;
  console.log(`Change in ${db}.${coll}: ${change.operationType}`);
});
```

## Using Async Iteration

```javascript
async function watchWithAsyncIterator() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const collection = client.db('appdb').collection('orders');
  const changeStream = collection.watch([], { fullDocument: 'updateLookup' });

  try {
    for await (const change of changeStream) {
      console.log('Processing change:', change.operationType);
      await processChange(change);
    }
  } finally {
    await changeStream.close();
    await client.close();
  }
}
```

## Close a Change Stream Gracefully

```javascript
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await changeStream.close();
  await client.close();
  process.exit(0);
});
```

## Python Example with PyMongo

```python
from pymongo import MongoClient
import os

client = MongoClient(os.environ["MONGODB_URI"])
collection = client["appdb"]["orders"]

with collection.watch(full_document="updateLookup") as stream:
    for change in stream:
        op = change["operationType"]
        print(f"Operation: {op}")

        if op == "insert":
            print("New order:", change["fullDocument"])
        elif op == "update":
            print("Updated fields:", change["updateDescription"]["updatedFields"])
```

## Summary

Change streams provide a reliable way to react to MongoDB data changes in real time by subscribing to collection, database, or deployment-level event streams. Open a stream with `.watch()`, listen for change events by operation type, request `fullDocument: 'updateLookup'` for full document access on updates, and handle `invalidate` events by restarting the stream. Use resume tokens (covered in the next guide) to ensure no events are missed after reconnections.
