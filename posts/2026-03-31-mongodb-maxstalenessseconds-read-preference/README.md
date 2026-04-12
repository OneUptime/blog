# How to Use maxStalenessSeconds with Read Preferences in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Replication, Staleness, Replica Set

Description: Learn how to use maxStalenessSeconds in MongoDB read preferences to exclude lagging secondaries and prevent stale reads beyond an acceptable threshold.

---

## What Is maxStalenessSeconds?

`maxStalenessSeconds` is a read preference option that limits which secondaries are eligible to serve reads based on their replication lag. When a secondary's lag exceeds this threshold, it is excluded from the candidate pool for that read operation.

It prevents your application from reading data from a secondary that is significantly behind the primary.

## The Problem It Solves

Without `maxStalenessSeconds`, a secondary that is 10 minutes behind the primary could still serve reads. Your application might receive data that is dramatically stale without any indication:

```text
Primary at T=600s
Secondary 1 at T=595s (5s lag - acceptable)
Secondary 2 at T=0s   (600s lag - secondary is stuck)

Without maxStalenessSeconds: reads may go to secondary 2
With maxStalenessSeconds=90: secondary 2 is excluded
```

## Setting maxStalenessSeconds

In the connection string:

```text
mongodb://mongo1,mongo2,mongo3/myapp?readPreference=secondary&maxStalenessSeconds=120&replicaSet=rs0
```

In the Node.js driver:

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const readPref = new ReadPreference("secondaryPreferred", null, {
  maxStalenessSeconds: 120
});

const client = new MongoClient("mongodb://mongo1,mongo2,mongo3/?replicaSet=rs0", {
  readPreference: readPref
});
```

At query level:

```javascript
db.reports.find({ date: "2026-03" }).readPref("secondary", [], { maxStalenessSeconds: 90 })
```

## Minimum Valid Value

The minimum allowed `maxStalenessSeconds` is 90 seconds. Values below 90 are rejected by the driver:

```text
Error: maxStalenessSeconds must be at least 90 seconds
```

This minimum exists because MongoDB's heartbeat interval is 10 seconds and the driver needs enough margin to accurately estimate lag.

## How Staleness Is Estimated

MongoDB drivers estimate secondary staleness using the following formula when a primary is known:

```text
estimatedStaleness = (S.lastUpdateTime - S.lastWriteDate) - (P.lastUpdateTime - P.lastWriteDate) + heartbeatFrequencyMS
```

Where `S` is the secondary, `P` is the primary, `lastUpdateTime` is when the driver last received a `hello` response from that server, and `lastWriteDate` is from that response. The `heartbeatFrequencyMS` (default 10 seconds) is added as a tolerance buffer.

When no primary is known, the driver uses:

```text
estimatedStaleness = SMax.lastWriteDate - S.lastWriteDate + heartbeatFrequencyMS
```

Where `SMax` is the secondary with the most recent `lastWriteDate`.

## Behavior When All Secondaries Exceed the Threshold

If every secondary is lagging more than `maxStalenessSeconds`:

- With `"secondary"` mode: the operation fails with a `NoReplicaSetSecondaryOk` error
- With `"secondaryPreferred"` mode: falls back to the primary
- With `"nearest"` mode: considers the primary if it is within the latency threshold

```javascript
try {
  const result = await collection.find({}).readPref("secondary", [], {
    maxStalenessSeconds: 90
  }).toArray();
} catch (err) {
  if (err.message.includes("No replica set secondary")) {
    // All secondaries are too stale; implement fallback logic
    console.error("All secondaries lagging, consider primaryPreferred");
  }
}
```

## Compatible Read Preferences

`maxStalenessSeconds` can be used with any read preference except `"primary"`:

```text
primary                 Not supported (primary is always current)
primaryPreferred        Supported (limits fallback secondaries)
secondary               Supported
secondaryPreferred      Supported (limits eligible secondaries; may fall back to primary)
nearest                 Supported (combined with latency filtering)
```

## Practical Configuration for Analytics Workloads

For a reporting service that runs hourly reports and can tolerate up to 5 minutes of lag:

```javascript
const analyticsClient = new MongoClient(
  "mongodb://mongo1,mongo2,mongo3/?replicaSet=rs0",
  {
    readPreference: new ReadPreference("secondaryPreferred", null, {
      maxStalenessSeconds: 300  // 5 minutes
    })
  }
);
```

For near-real-time dashboards that can tolerate only 2 minutes:

```javascript
const dashboardClient = new MongoClient(uri, {
  readPreference: new ReadPreference("secondaryPreferred", null, {
    maxStalenessSeconds: 120  // 2 minutes (minimum is 90)
  })
});
```

## Monitoring Replication Lag

Check current lag values to set an appropriate threshold:

```javascript
const status = rs.status();
const primary = status.members.find(m => m.stateStr === "PRIMARY");

status.members
  .filter(m => m.stateStr === "SECONDARY")
  .forEach(s => {
    const lagSec = (primary.optimeDate - s.optimeDate) / 1000;
    print(`${s.name}: ${lagSec.toFixed(1)}s lag`);
  });
```

Set `maxStalenessSeconds` to at least 3-4x your typical lag to avoid frequent exclusions.

## Summary

`maxStalenessSeconds` prevents applications from reading from severely lagging secondaries by excluding them from the read preference candidate pool. Set it to a value that reflects your acceptable data freshness, keeping in mind the 90-second minimum. Monitor actual replication lag with `rs.status()` and tune the threshold to be realistically higher than typical lag while protecting against runaway secondaries.
