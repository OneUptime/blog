# How to Test Change Stream Handlers in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Testing, Replica Set, Jest

Description: Learn how to test MongoDB change stream handlers by running a replica set in-memory and triggering change events to verify that your handler logic executes correctly.

---

## Testing Change Streams Requires a Replica Set

Change streams only work on MongoDB replica sets or sharded clusters. For testing, use `MongoMemoryReplSet` from `mongodb-memory-server` to start a single-node replica set in-process.

## Setup

```bash
npm install --save-dev mongodb-memory-server mongodb jest
```

```javascript
// tests/changeStream.test.js
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let replSet, client, db;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = new MongoClient(replSet.getUri());
  await client.connect();
  db = client.db('testdb');
}, 60000);

afterAll(async () => {
  await client.close();
  await replSet.stop();
});

beforeEach(async () => {
  await db.collection('orders').deleteMany({});
});
```

## The Handler Under Test

```javascript
// src/handlers/orderChangeHandler.js
async function handleOrderChange(event, notificationService) {
  if (event.operationType === 'insert') {
    await notificationService.notify({
      type: 'new_order',
      orderId: event.documentKey._id,
    });
  } else if (event.operationType === 'update') {
    const status = event.updateDescription?.updatedFields?.status;
    if (status === 'shipped') {
      await notificationService.notify({
        type: 'order_shipped',
        orderId: event.documentKey._id,
      });
    }
  }
}

module.exports = { handleOrderChange };
```

## Testing the Handler with a Real Change Stream

```javascript
const { handleOrderChange } = require('../src/handlers/orderChangeHandler');

it('calls notificationService with new_order on insert', async () => {
  const orders = db.collection('orders');
  const notificationService = { notify: jest.fn().mockResolvedValue(true) };

  // Open a change stream
  const changeStream = orders.watch([], { fullDocument: 'updateLookup' });

  // Collect the next event, then close
  const eventPromise = new Promise((resolve) => {
    changeStream.once('change', async (event) => {
      await handleOrderChange(event, notificationService);
      resolve();
    });
  });

  // Trigger the change
  await orders.insertOne({ customerId: 'C001', total: 49.99 });

  // Wait for the handler to process
  await eventPromise;
  await changeStream.close();

  expect(notificationService.notify).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'new_order' })
  );
});
```

## Testing Update Events

```javascript
it('calls notificationService with order_shipped when status updated', async () => {
  const orders = db.collection('orders');
  const notificationService = { notify: jest.fn().mockResolvedValue(true) };

  const { insertedId } = await orders.insertOne({ customerId: 'C001', status: 'pending' });

  const changeStream = orders.watch(
    [{ $match: { operationType: 'update' } }],
    { fullDocument: 'updateLookup' }
  );

  const eventPromise = new Promise((resolve) => {
    changeStream.once('change', async (event) => {
      await handleOrderChange(event, notificationService);
      resolve();
    });
  });

  await orders.updateOne({ _id: insertedId }, { $set: { status: 'shipped' } });
  await eventPromise;
  await changeStream.close();

  expect(notificationService.notify).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'order_shipped', orderId: insertedId })
  );
});
```

## Testing Resume Token Handling

```javascript
it('resumes a change stream from a stored token', async () => {
  const orders = db.collection('orders');

  // Capture a resume token from the first event
  const stream1 = orders.watch();
  const tokenPromise = new Promise((resolve) => {
    stream1.once('change', (event) => resolve(event._id));
  });
  await orders.insertOne({ test: 1 });
  const resumeToken = await tokenPromise;
  await stream1.close();

  // Resume from that token - should see only subsequent events
  const stream2 = orders.watch([], { resumeAfter: resumeToken });
  const eventPromise = new Promise((resolve) => {
    stream2.once('change', resolve);
  });
  await orders.insertOne({ test: 2 });

  const event = await eventPromise;
  await stream2.close();

  expect(event.fullDocument.test).toBe(2);
});
```

## Summary

Test change stream handlers by opening a real change stream against an in-memory replica set, triggering mutations, and asserting that your handler logic executes correctly. Mock downstream services (like notification systems) to test handler behavior in isolation. Always close change streams in test cleanup to prevent resource leaks.
