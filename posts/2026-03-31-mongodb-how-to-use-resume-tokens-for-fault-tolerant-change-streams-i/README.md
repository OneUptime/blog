# How to Use Resume Tokens for Fault-Tolerant Change Streams in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Resume Token, Fault Tolerance, Reliability

Description: Implement fault-tolerant MongoDB change streams using resume tokens to ensure no events are missed when a stream disconnects or your application restarts.

---

## Why Resume Tokens Matter

A change stream that crashes or disconnects without a resume token must restart from the current oplog position - missing all events that occurred during the downtime. Resume tokens let you resume a stream from exactly where it left off, guaranteeing at-least-once delivery.

Every change event includes a `_id` field that serves as its resume token.

## Understanding Resume Tokens

```javascript
// Each change event looks like this
{
  "_id": {
    "_data": "8265A3B0C1000000012B022C0100296E5A10046B..."
  },
  "operationType": "insert",
  "fullDocument": { ... },
  ...
}

// The _id field IS the resume token
const resumeToken = change._id;
```

## Step 1: Save Resume Tokens Persistently

Store the resume token after processing each event:

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
let resumeToken = null;

async function processAndSaveToken(change) {
  // Process the change event
  await handleChange(change);

  // Save resume token AFTER successful processing
  resumeToken = change._id;
  await saveResumeToken(resumeToken);
}

async function saveResumeToken(token) {
  const db = client.db('appdb');
  await db.collection('stream_state').updateOne(
    { _id: 'orders_stream' },
    { $set: { resumeToken: token, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function loadResumeToken() {
  const db = client.db('appdb');
  const state = await db.collection('stream_state').findOne({ _id: 'orders_stream' });
  return state?.resumeToken || null;
}
```

## Step 2: Resume from a Saved Token

```javascript
async function watchOrders() {
  const collection = client.db('appdb').collection('orders');

  // Load saved resume token
  const savedToken = await loadResumeToken();

  const options = savedToken
    ? { resumeAfter: savedToken, fullDocument: 'updateLookup' }
    : { fullDocument: 'updateLookup' };

  console.log(savedToken ? 'Resuming from saved token' : 'Starting fresh');

  const changeStream = collection.watch([], options);

  changeStream.on('change', async (change) => {
    try {
      await processAndSaveToken(change);
    } catch (err) {
      console.error('Failed to process change:', err);
      // Don't update token - will retry on reconnect
    }
  });

  changeStream.on('error', async (err) => {
    console.error('Stream error:', err.message);
    await changeStream.close();
    // Reconnect after brief delay
    setTimeout(watchOrders, 1000);
  });

  return changeStream;
}
```

## Step 3: Use startAfter vs resumeAfter

Two token-based options with different behaviors:

```javascript
// resumeAfter: resume from token (fails if token is no longer in oplog)
collection.watch([], { resumeAfter: savedToken })

// startAfter: start after token (works even after invalidate events)
collection.watch([], { startAfter: savedToken })
```

Prefer `startAfter` when your stream might encounter `invalidate` events (collection drop/rename).

## Step 4: Use startAtOperationTime

Alternatively, start from a specific cluster time:

```javascript
const { Timestamp } = require('mongodb');

// Start from a specific Unix timestamp
const startTime = new Timestamp({ t: Math.floor(Date.now() / 1000), i: 0 });

const changeStream = collection.watch([], {
  startAtOperationTime: startTime
});
```

This is useful for time-based recovery when you know approximately when events were missed.

## Complete Fault-Tolerant Implementation

```javascript
const { MongoClient } = require('mongodb');

class FaultTolerantChangeStream {
  constructor(uri, dbName, collName, handler) {
    this.uri = uri;
    this.dbName = dbName;
    this.collName = collName;
    this.handler = handler;
    this.client = null;
    this.stream = null;
    this.running = false;
  }

  async start() {
    this.running = true;
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    await this.run();
  }

  async run() {
    const db = this.client.db(this.dbName);
    const collection = db.collection(this.collName);
    const stateCollection = db.collection('stream_state');

    const state = await stateCollection.findOne({ _id: `${this.dbName}.${this.collName}` });
    const savedToken = state?.resumeToken;

    const options = {};
    if (savedToken) {
      options.startAfter = savedToken;
    }
    options.fullDocument = 'updateLookup';

    console.log(savedToken ? `Resuming stream from token` : `Starting fresh stream`);

    this.stream = collection.watch([], options);

    try {
      for await (const change of this.stream) {
        if (!this.running) break;

        await this.handler(change);

        // Save token after successful handling
        await stateCollection.updateOne(
          { _id: `${this.dbName}.${this.collName}` },
          { $set: { resumeToken: change._id, lastProcessed: new Date() } },
          { upsert: true }
        );
      }
    } catch (err) {
      if (!this.running) return;
      console.error('Stream error, restarting in 2s:', err.message);
      await new Promise(r => setTimeout(r, 2000));
      await this.run();
    }
  }

  async stop() {
    this.running = false;
    if (this.stream) await this.stream.close();
    if (this.client) await this.client.close();
  }
}

// Usage
const watcher = new FaultTolerantChangeStream(
  process.env.MONGODB_URI,
  'appdb',
  'orders',
  async (change) => {
    console.log(`Processing ${change.operationType} on order ${change.documentKey._id}`);
    await notifyOrderService(change);
  }
);

watcher.start();

process.on('SIGINT', () => watcher.stop());
```

## Oplog Window Considerations

Resume tokens reference oplog positions. If your application is down longer than the oplog window (typically 24h-72h), the token may no longer be valid:

```javascript
changeStream.on('error', (err) => {
  if (err.code === 286) {
    // ChangeStreamHistoryLost - oplog has been overwritten
    console.error('Resume token expired - oplog window exceeded');
    // Must restart from current position (events lost)
    resumeToken = null;
    watchOrders();
  }
});
```

Monitor oplog window size and set appropriate alerts.

## Summary

Resume tokens provide the mechanism for reliable change stream processing by recording the stream's position after each processed event. Store tokens in MongoDB itself, use `startAfter` to resume on reconnect, and handle `ChangeStreamHistoryLost` errors for cases where the oplog window has been exceeded. Combine with exponential backoff reconnection logic to build a fault-tolerant event processing pipeline.
