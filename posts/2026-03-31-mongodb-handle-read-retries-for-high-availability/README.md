# How to Handle Read Retries for High Availability in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, High Availability, Retry, Read Preference, Resilience

Description: Learn how to configure retryable reads, read preferences, and manual retry logic in MongoDB to keep your application resilient during failovers and network errors.

---

Read retries ensure your application can recover from transient failures during primary elections, network interruptions, or node restarts. MongoDB provides built-in retryable reads and configurable read preferences to route queries to available nodes automatically.

## Enable Retryable Reads

Retryable reads are enabled by default in MongoDB drivers 4.2 and above. You can verify and explicitly enable them in the client options.

```javascript
const client = new MongoClient(uri, {
  retryReads: true
});
await client.connect();
```

With retryable reads enabled, the driver automatically retries a read operation that fails due to a network error or a primary step-down, once, before returning an error to the application.

## Configure Read Preference for Failover Resilience

Use `primaryPreferred` or `secondaryPreferred` read preference so MongoDB can route reads to available nodes even during a primary election.

```javascript
const db = client.db("myapp");
const users = db.collection("users").withReadPreference("primaryPreferred");

// Reads go to primary normally, fall back to secondary during failover
const result = await users.find({ status: "active" }).toArray();
```

For analytics workloads that can tolerate slightly stale data, use `secondary` to route all reads to secondaries and offload the primary.

```javascript
const analyticsDb = client.db("myapp").withReadPreference("secondary");
```

## Set MaxStalenessSeconds to Limit Data Staleness

When reading from secondaries, limit how stale the data can be using `maxStalenessSeconds`.

```javascript
const { ReadPreference } = require("mongodb");
const pref = new ReadPreference("secondaryPreferred", null, {
  maxStalenessSeconds: 90
});

const collection = db.collection("events").withReadPreference(pref);
```

MongoDB will only route reads to secondaries whose replication lag is within 90 seconds. If no secondary meets this threshold, the read goes to the primary.

## Implement Manual Retry for Read Operations

For operations that require stronger guarantees or involve cursors, implement a manual retry loop.

```javascript
async function readWithRetry(queryFn, maxAttempts = 3) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await queryFn();
    } catch (err) {
      const isRetryable =
        err.code === 91 ||
        err.code === 189 ||
        err.message?.includes("not master") ||
        err.message?.includes("not primary") ||
        err.message?.includes("node is recovering");

      if (isRetryable && attempt < maxAttempts - 1) {
        const delay = Math.pow(2, attempt) * 200;
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

// Usage
const orders = await readWithRetry(() =>
  db.collection("orders")
    .find({ userId: "u123", status: "active" })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray()
);
```

## Use Hedged Reads for Latency-Sensitive Workloads

Hedged reads send the same read operation to two replica set members simultaneously and use the first response. This reduces tail latency.

```javascript
const { ReadPreference } = require("mongodb");
const pref = new ReadPreference("nearest", null, { hedge: { enabled: true } });

const collection = db.collection("products").withReadPreference(pref);
const product = await collection.findOne({ _id: productId });
```

Hedged reads are available in MongoDB 4.4 and above with sharded clusters (mongos) and work with `nearest`, `primaryPreferred`, `secondary`, and `secondaryPreferred` read preferences.

## Monitor Read Failures with serverStatus

Track read errors to detect patterns that indicate replica set instability.

```javascript
const status = await db.admin().command({ serverStatus: 1 });
console.log({
  connections: status.connections.current,
  networkBytesIn: status.network.bytesIn,
  opCounters: status.opcounters.query
});
```

Integrate these metrics into your monitoring dashboard and set alerts when query error rates exceed a threshold.

## Summary

Handling read retries for high availability in MongoDB combines built-in retryable reads with appropriate read preferences such as `primaryPreferred` to route queries to available nodes during failover. Use `maxStalenessSeconds` to control data freshness when reading from secondaries, implement manual retry loops with exponential backoff for cursor-based operations, and consider hedged reads for latency-sensitive workloads in MongoDB 4.4 and above.
