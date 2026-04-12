# How to Respond to MongoDB Election Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Election, High Availability, Operation

Description: Learn how to respond to MongoDB replica set election events, understand why elections happen, and minimize application impact during primary failovers.

---

## What Is a MongoDB Election?

A replica set election occurs when the current primary becomes unavailable or steps down. The remaining voting members elect a new primary. Elections typically complete in under 12 seconds (median), during which no writes are accepted. Applications experience a brief window of `NotWritablePrimary` errors.

## Why Elections Happen

Common causes:
- Network partition between primary and majority of replica set
- Primary running out of disk space or memory
- Manual `rs.stepDown()` during maintenance
- Primary process crash or restart
- Atlas maintenance or auto-scaling event

## Step 1: Detect an Election in Progress

In `mongosh`, check the replica set status:

```javascript
rs.status().members.forEach(m => {
  print(m.name, m.stateStr, "health:", m.health);
});
```

Watch for the absence of any member with `stateStr: "PRIMARY"`, which indicates an election is in progress.

Check the system log for election events:

```bash
grep "ELECTION\|PRIMARY\|SECONDARY" /var/log/mongodb/mongod.log | tail -30
```

On Atlas, view the replica set events in the Clusters > Events tab.

## Step 2: Handle Elections in Application Code

### Node.js - Enable retryable writes

Retryable writes automatically retry a single-statement write that failed due to a transient error like an election:

```javascript
const client = new MongoClient(uri, {
  retryWrites: true,      // default true in MongoDB driver 4.x+
  retryReads: true,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 2000
});
```

### Python - Retryable writes

```python
from pymongo import MongoClient

client = MongoClient(
    uri,
    retryWrites=True,
    serverSelectionTimeoutMS=30000,
    heartbeatFrequencyMS=2000
)
```

### Handling NotPrimaryError in code

```javascript
const { MongoServerError } = require("mongodb");

async function writeWithRetry(collection, doc, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await collection.insertOne(doc);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 10107) {
        // NotWritablePrimary - wait for election to complete
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 5000));
        else throw err;
      } else {
        throw err;
      }
    }
  }
}
```

## Step 3: Investigate the Root Cause

After the election, check why it happened:

```javascript
// Check for primary step-down reason in logs
// Atlas: view the Events tab for "Primary Changed" events
rs.status().members.filter(m => m.stateStr === "PRIMARY")[0];
```

Check the oplog for any missing operations:

```javascript
db.getSiblingDB("local").oplog.rs
  .find()
  .sort({ $natural: -1 })
  .limit(5);
```

## Step 4: Reduce Election Frequency

```javascript
// Increase election timeout (milliseconds) to tolerate brief network blips
const cfg = rs.conf();
cfg.settings.electionTimeoutMillis = 15000;  // default: 10000 (10 seconds)
cfg.settings.heartbeatTimeoutSecs = 15;      // default: 10
rs.reconfig(cfg);
```

## Summary

MongoDB replica set elections are a normal part of high availability but require applications to handle `NotWritablePrimary` errors gracefully. Enable retryable writes in your driver, set `serverSelectionTimeoutMS` to at least 30 seconds to survive the election window, and catch election-related error codes (10107) for operations that need explicit retry logic. After an election, investigate the root cause in the replica set logs or Atlas Events tab to prevent recurring elections from unstable nodes.
