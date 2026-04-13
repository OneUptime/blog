# How to Fix MongoError: ChangeStream Fatal Error in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Error, Replica Set, Resume Token

Description: Learn why MongoDB change streams emit fatal errors and how to fix them by resuming streams, handling invalidation, and managing replica set events properly.

---

## Understanding the Error

A change stream "fatal error" means the stream has encountered an unrecoverable condition and will not emit further events. Common scenarios:

```text
MongoServerError: ChangeStream is closed due to an error from the server
MongoError: ChangeStream fatal error: namespace not found
```

Unlike transient errors (network blip), fatal errors require the stream to be recreated.

## Common Fatal Error Scenarios

### 1. The Watched Collection Was Dropped

If you open a change stream on a specific collection and that collection is dropped, the stream receives an `invalidate` event followed by closure:

```javascript
const stream = db.collection('orders').watch();

stream.on('change', (change) => {
  if (change.operationType === 'invalidate') {
    console.log('Collection dropped - stream invalidated');
    stream.close();
    // Reopen on the new collection after recreation
  }
});

stream.on('error', (err) => {
  console.error('Fatal stream error:', err.message);
  // Recreate the stream
  reopenStream();
});
```

### 2. Resume Token Expired (Oplog Rollover)

Change streams use resume tokens backed by oplog entries. If the oplog is too small and rolls over before you resume:

```text
MongoServerError: Resume of change stream was not possible, as the resume point
may no longer be in the oplog.
```

**Fix:** Resize the oplog and implement robust resume logic:

```javascript
let resumeToken = null;

async function openStream(collection) {
  const options = resumeToken ? { resumeAfter: resumeToken } : {};

  const stream = collection.watch([], options);

  stream.on('change', (change) => {
    resumeToken = change._id; // persist this token
    processChange(change);
  });

  stream.on('error', async (err) => {
    console.error('Stream error:', err.message);
    await new Promise(r => setTimeout(r, 1000));
    openStream(collection); // reopen with last token
  });

  return stream;
}
```

Persist the resume token to durable storage (e.g., a MongoDB document or Redis) so it survives process restarts:

```javascript
async function saveResumeToken(token) {
  await db.collection('stream_state').updateOne(
    { _id: 'orders_stream' },
    { $set: { token, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function loadResumeToken() {
  const state = await db.collection('stream_state').findOne({ _id: 'orders_stream' });
  return state?.token || null;
}
```

### 3. Replica Set Election

During a primary election, the change stream may encounter a temporary error. Implement a reconnect loop to handle this:

```javascript
async function watchWithReconnect(collection, pipeline = []) {
  let token = await loadResumeToken();

  while (true) {
    try {
      const opts = token ? { resumeAfter: token } : {};
      const stream = collection.watch(pipeline, opts);

      for await (const change of stream) {
        token = change._id;
        await saveResumeToken(token);
        await processChange(change);
      }
    } catch (err) {
      if (err.code === 280 || err.message.includes('resume point')) {
        token = null; // cannot resume, start fresh
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
```

### 4. Full Document Lookup on Deleted Documents

Using `fullDocument: 'updateLookup'` returns `null` for the `fullDocument` field if the document has been deleted before the lookup occurs. To get post-images more reliably, use `fullDocument: 'whenAvailable'` in MongoDB 6.0+, which uses stored post-images instead of a separate lookup. This requires enabling change stream pre- and post-images on the collection first:

```javascript
// Enable pre/post images on the collection
// db.runCommand({ collMod: 'orders', changeStreamPreAndPostImages: { enabled: true } })

const stream = db.collection('orders').watch([], {
  fullDocument: 'whenAvailable'
});
```

## Summary

Change stream fatal errors are caused by collection drops, expired resume tokens from oplog rollover, or replica set topology changes. Fix them by persisting resume tokens, implementing reconnect loops with exponential backoff, handling `invalidate` events gracefully, and sizing the oplog to hold enough history for your processing lag.
