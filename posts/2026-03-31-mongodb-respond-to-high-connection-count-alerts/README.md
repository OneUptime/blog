# How to Respond to MongoDB High Connection Count Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Alert, Connection, Operation, Performance

Description: Learn how to diagnose and resolve MongoDB high connection count alerts by identifying connection leaks, tuning pool sizes, and using connection limiting features.

---

## Why Connection Count Matters

MongoDB has a maximum connection limit per mongod/mongos process. When connections approach this limit, new connection attempts fail with errors like `connection refused` or `too many open connections`. High connection counts usually indicate connection pool misconfiguration, connection leaks, or an application tier that has scaled out without adjusting pool settings.

## Step 1: Check Current Connection Count

```javascript
db.adminCommand({ serverStatus: 1 }).connections;
// Returns: { current: 487, available: 513, totalCreated: 12408 }
```

The limit on Atlas M10 is typically 1500 connections. M30 allows 3000. For self-managed `mongod`, the default is based on `ulimit` open files.

## Step 2: Identify Who Holds Connections

```javascript
// List active connections with their origins
db.adminCommand({ currentOp: true }).inprog
  .filter(op => op.connectionId)
  .reduce((acc, op) => {
    const key = op.client || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
```

Look for a single client IP holding hundreds of connections - that is your leak source.

## Step 3: Common Causes and Fixes

### Connection pool size too large per instance

Each application server opens its own pool. With 50 pods each running `maxPoolSize: 100`, you get 5,000 connections. Reduce the pool size per instance:

```javascript
// Node.js (MongoDB driver)
const client = new MongoClient(uri, {
  maxPoolSize: 20,     // reduced from default 100
  minPoolSize: 2,
  waitQueueTimeoutMS: 5000
});
```

```python
# Python (pymongo)
from pymongo import MongoClient
client = MongoClient(uri, maxPoolSize=20, minPoolSize=2)
```

### Connection leaks in application code

Ensure every connection checkout returns to the pool:

```javascript
// Wrong: never closes the session
const session = client.startSession();
await doWork(session);
// Missing: session.endSession()

// Correct: always close in a finally block
const session = client.startSession();
try {
  await doWork(session);
} finally {
  await session.endSession();
}
```

### Serverless functions creating new clients per invocation

```javascript
// Bad: creates a new pool on every Lambda invocation
exports.handler = async (event) => {
  const client = new MongoClient(uri);
  await client.connect();
  // ...
};

// Good: reuse the client across warm invocations
let client;
exports.handler = async (event) => {
  if (!client) {
    client = new MongoClient(uri, { maxPoolSize: 5 });
    await client.connect();
  }
  // ...
};
```

## Step 4: Enable Connection Limits in MongoDB

Set the maximum number of simultaneous connections with `maxIncomingConnections`:

```javascript
db.adminCommand({
  setParameter: 1,
  maxIncomingConnections: 1000
});
```

On Atlas, connection limits are enforced by tier. You can also use a connection pooler like `mongos` for sharded setups.

## Step 5: Configure Atlas Alerts

```bash
atlas alerts settings create \
  --event OUTSIDE_METRIC_THRESHOLD \
  --enabled \
  --notificationType EMAIL \
  --notificationEmailAddress ops@example.com \
  --metricName CONNECTIONS_PERCENT \
  --metricMode AVERAGE \
  --metricOperator GREATER_THAN \
  --metricThreshold 80 \
  --metricUnits RAW
```

## Summary

High MongoDB connection count alerts usually stem from oversized connection pools multiplied by many application instances, connection leaks in application code, or serverless functions recreating the client on each invocation. Diagnose with `serverStatus` and `currentOp`, reduce `maxPoolSize` per application instance, fix leaks by ensuring sessions are always closed, and reuse MongoClient instances across invocations. Set Atlas alerts at 70-80% of connection capacity.
