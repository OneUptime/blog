# How to Handle Stale Reads from Secondaries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Read Preference, Consistency, Secondary

Description: Learn how to detect, control, and mitigate stale reads from MongoDB secondaries using read preferences, maxStalenessSeconds, and causally consistent sessions.

---

## Why Secondaries Return Stale Data

MongoDB replica sets replicate writes from the primary to secondaries asynchronously. This means a secondary's data is always some period behind the primary - even if just by milliseconds in a healthy cluster. Under load, network partition, or hardware issues, replication lag can grow to seconds or minutes.

When your application reads from secondaries with `secondaryPreferred` or `secondary` read preference, it may see documents that have not yet reflected recent writes.

## Measuring Replication Lag

Before addressing stale reads, quantify your replication lag:

```javascript
// Check replication lag across all secondaries
rs.printSecondaryReplicationInfo();

// More detailed lag information
rs.status().members.forEach(member => {
  if (member.stateStr === "SECONDARY") {
    const lag = (new Date() - member.optimeDate) / 1000;
    print(`${member.name}: lag = ${lag.toFixed(1)}s`);
  }
});
```

## Setting maxStalenessSeconds on Read Preference

MongoDB allows you to specify the maximum acceptable replication lag for reads using `maxStalenessSeconds`. If all secondaries exceed this staleness threshold, the driver falls back to the primary.

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  readPreference: new ReadPreference(
    ReadPreference.SECONDARY_PREFERRED,
    null,
    { maxStalenessSeconds: 90 }   // Only use secondaries lagging <= 90 seconds
  )
});
```

The minimum allowed value is 90 seconds (due to heartbeat intervals). Lower values will cause errors.

```python
# Python equivalent
import pymongo

client = pymongo.MongoClient(
    "mongodb://localhost:27017",
    readPreference="secondaryPreferred",
    maxStalenessSeconds=90
)
```

## Using majority Read Concern to Prevent Stale Reads

Use `majority` read concern on secondary reads to ensure the data seen has been confirmed by a majority of the replica set - protecting against reading uncommitted or yet-to-replicate data.

```javascript
const result = await collection.findOne(
  { _id: docId },
  {
    readPreference: "secondaryPreferred",
    readConcern: { level: "majority" }
  }
);
```

## Routing Critical Reads to the Primary

For reads where staleness is not acceptable - such as displaying a user's own profile after update, or reading a financial balance - route reads to the primary.

```javascript
// Force read to primary for critical data
const latestBalance = await accounts.findOne(
  { userId: "u-123" },
  { readPreference: "primary" }
);
```

## Using Causally Consistent Sessions

For operations that must read their own writes, use a causally consistent session to ensure the serving node is caught up to the point of your last write.

```javascript
const session = client.startSession({ causalConsistency: true });

await collection.updateOne(
  { _id: docId },
  { $set: { status: "active" } },
  { session }
);

// Guaranteed to see the above write even on a secondary
const doc = await collection.findOne(
  { _id: docId },
  { session, readPreference: "secondaryPreferred" }
);

await session.endSession();
```

## Monitoring Stale Reads in Application Logs

Log read preference and replication lag information when debugging staleness issues:

```javascript
// On the secondary, check its current lag
db.adminCommand({ replSetGetStatus: 1 }).members
  .filter(m => m.self)
  .forEach(m => print(`This node lag: ${m.optimeDate}`));
```

## Summary

Stale reads from MongoDB secondaries are an inherent consequence of asynchronous replication. Use `maxStalenessSeconds` on your read preference to exclude heavily lagging secondaries. Use `majority` read concern for reads where you cannot tolerate rolled-back data. Route latency-sensitive or write-following reads to the primary. For read-your-own-writes requirements, use causally consistent sessions with `causalConsistency: true`. Monitor replication lag actively and alert before it grows beyond your acceptable staleness threshold.
