# How to Use resumeAfter vs startAfter vs startAtOperationTime in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Change Stream, Resume Token, Fault Tolerance, Replication

Description: Understand the differences between resumeAfter, startAfter, and startAtOperationTime options in MongoDB Change Streams to build fault-tolerant event consumers.

---

MongoDB provides three options for controlling where a Change Stream cursor starts reading. Choosing the right one depends on whether you have a resume token, whether the stream was invalidated, and whether you need to replay from a specific point in time.

## Overview of the Three Options

| Option | Requires | Behavior |
|--------|----------|----------|
| `resumeAfter` | A resume token | Resumes from just after the event with that token |
| `startAfter` | A resume token | Starts after any token, including invalidation events |
| `startAtOperationTime` | A `Timestamp` | Opens a new stream from a wall-clock point in the oplog |

## resumeAfter: Standard Restart After a Crash

`resumeAfter` is the most common option. It picks up immediately after the last successfully processed event.

```javascript
const { MongoClient } = require("mongodb");

async function resumeStream(savedToken) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const collection = client.db("shop").collection("orders");

  const options = savedToken ? { resumeAfter: savedToken } : {};

  const stream = collection.watch([], options);

  stream.on("change", async (event) => {
    await processEvent(event);
    // Persist the token after processing
    await saveToken(event._id);
  });
}
```

**Limitation:** `resumeAfter` throws an error if the token points to an invalidation event (e.g., collection dropped or renamed).

## startAfter: Resume Including After Invalidation

`startAfter` behaves like `resumeAfter` but can resume even if the last saved token belongs to an invalidation event. Use this when your stream may have been watching a collection that was dropped or recreated.

```javascript
const stream = collection.watch([], {
  startAfter: savedToken  // safe even if savedToken is from a "drop" event
});
```

This is the safer default if your application drops and recreates collections as part of maintenance.

## startAtOperationTime: Replay from a Timestamp

Use `startAtOperationTime` when you do not have a resume token but know the wall-clock time from which you want to replay events.

```javascript
const { Timestamp } = require("mongodb");

// Replay events starting from a specific Unix timestamp
const startTime = new Timestamp({ t: Math.floor(Date.now() / 1000) - 3600, i: 0 }); // 1 hour ago

const stream = collection.watch([], {
  startAtOperationTime: startTime
});
```

**Important:** The timestamp must fall within the oplog window. If the requested time is older than the oldest oplog entry, MongoDB throws a `ChangeStreamHistoryLost` error.

## Decision Tree

```text
Do you have a resume token?
  YES -> Was the last event an invalidation?
           YES -> Use startAfter
           NO  -> Use resumeAfter
  NO  -> Do you know the replay timestamp?
           YES -> Use startAtOperationTime
           NO  -> Open a fresh stream (no option needed)
```

## Handling ChangeStreamHistoryLost

If the oplog window has rolled past your token or timestamp, MongoDB raises this error:

```javascript
stream.on("error", (err) => {
  if (err.code === 286) {
    // ChangeStreamHistoryLost - must re-bootstrap from current state
    console.error("Oplog window expired. Full re-sync required.");
    triggerFullResync();
  } else {
    throw err;
  }
});
```

Monitor oplog window length with:

```javascript
db.getSiblingDB("local").oplog.rs.find().sort({ $natural: 1 }).limit(1).next();
db.getSiblingDB("local").oplog.rs.find().sort({ $natural: -1 }).limit(1).next();
```

## Summary

Use `resumeAfter` for normal crash recovery, `startAfter` when the prior stream may have been invalidated, and `startAtOperationTime` when replaying from a known point in time without a token. Always persist resume tokens durably and monitor oplog window size to avoid `ChangeStreamHistoryLost` errors.
