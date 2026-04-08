# How to Use MongoDB Change Streams for Inter-Service Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Microservice, Event, Communication

Description: Learn how to use MongoDB change streams as a lightweight event bus for inter-service communication without an external message broker.

---

MongoDB change streams provide a real-time feed of data changes in your collections. In a microservices architecture, they can serve as a lightweight event-sourcing mechanism - one service writes to its MongoDB collection, and other services react to those changes without a separate message broker.

## How Change Streams Work

Change streams are built on MongoDB's oplog (operations log), which records every write operation on a replica set. Change streams provide a clean, resumable API on top of the oplog so application code doesn't need to parse raw oplog entries.

```javascript
// Basic change stream - watch all changes on a collection
const { MongoClient } = require('mongodb');

async function watchCollection(uri, dbName, collectionName) {
  const client = new MongoClient(uri);
  await client.connect();

  const collection = client.db(dbName).collection(collectionName);
  const changeStream = collection.watch();

  changeStream.on('change', (event) => {
    console.log('Change detected:', JSON.stringify(event, null, 2));
  });
}
```

## Filtering Events by Operation Type

For inter-service communication, you typically only care about specific operations. Use a pipeline to filter:

```javascript
async function watchInserts(db, collectionName, handler) {
  const pipeline = [
    {
      $match: {
        operationType: { $in: ['insert', 'update', 'replace'] }
      }
    }
  ];

  const stream = db.collection(collectionName).watch(pipeline, {
    fullDocument: 'updateLookup'  // include full document on updates
  });

  for await (const change of stream) {
    await handler(change);
  }
}
```

## Implementing Service-to-Service Events

A common pattern: the payment service watches the orders collection for new `pending` orders and automatically processes payment:

```javascript
// Payment service watches order service's database
async function startPaymentProcessor(orderDb) {
  const pipeline = [
    {
      $match: {
        operationType: 'insert',
        'fullDocument.status': 'pending'
      }
    }
  ];

  const stream = orderDb.collection('orders').watch(pipeline, {
    fullDocument: 'updateLookup'
  });

  stream.on('change', async (event) => {
    const order = event.fullDocument;
    console.log(`Processing payment for order ${order._id}`);
    await processPayment(order);
  });
}
```

Note: this example requires both services to access the same MongoDB deployment. If strict database-per-service isolation is required, combine change streams with a message broker instead.

## Using Resume Tokens for Reliability

Change streams support resuming from where they left off using a resume token. Store the token after processing each event:

```javascript
async function reliableWatcher(db, collectionName, tokenStore) {
  const savedToken = await tokenStore.get(collectionName);

  const options = savedToken
    ? { resumeAfter: savedToken, fullDocument: 'updateLookup' }
    : { fullDocument: 'updateLookup' };

  const stream = db.collection(collectionName).watch([], options);

  stream.on('change', async (event) => {
    await processEvent(event);
    // Persist token so we can resume after a restart
    await tokenStore.save(collectionName, event._id);
  });

  stream.on('error', (err) => {
    console.error('Change stream error:', err);
    // Reconnect logic here
  });
}
```

## Combining Change Streams with a Message Broker

For more robust inter-service communication, use change streams to publish to Kafka or RabbitMQ. This decouples services completely:

```python
from pymongo import MongoClient
import json

def publish_changes(db, collection_name, producer):
    stream = db[collection_name].watch(full_document="updateLookup")
    for change in stream:
        event = {
            "id": str(change["documentKey"]["_id"]),
            "operation": change["operationType"],
            "document": change.get("fullDocument"),
        }
        producer.produce(
            topic=f"{collection_name}.events",
            value=json.dumps(event, default=str).encode("utf-8")
        )
        producer.flush()
```

## Summary

MongoDB change streams offer a practical way to implement inter-service communication without an external message broker in simpler architectures. For production systems with strict service isolation, combine change streams with a message broker to decouple services fully. Always store resume tokens to ensure at-least-once processing after restarts, and filter streams with aggregation pipelines to reduce noise and improve performance.
