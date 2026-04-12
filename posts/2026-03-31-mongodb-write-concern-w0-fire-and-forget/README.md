# How to Use Write Concern w:0 (Fire-and-Forget) in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Performance, Throughput, Logging

Description: Learn how MongoDB's write concern w:0 enables fire-and-forget writes with maximum throughput by not waiting for any server acknowledgment.

---

## What Is Write Concern w:0?

Write concern `w:0` is the "fire-and-forget" mode in MongoDB. The driver sends the write operation to the server and returns immediately without waiting for any acknowledgment. The server may accept, reject, or fail to process the write - the client receives no feedback.

This provides the absolute highest write throughput at the cost of zero durability guarantees.

## Setting w:0

At the operation level:

```javascript
db.metrics.insertOne(
  { metric: "api_latency_ms", value: 42, ts: new Date() },
  { writeConcern: { w: 0 } }
)
```

At the connection string level:

```text
mongodb://mongo1:27017/telemetry?w=0
```

At the driver client level (Node.js):

```javascript
const { MongoClient, WriteConcern } = require("mongodb");

const client = new MongoClient("mongodb://mongo1:27017", {
  writeConcern: new WriteConcern(0)
});
```

## What w:0 Returns

With `w:0`, the driver returns immediately with a minimal result object. The `acknowledged` field is `false`, and server-computed fields like `matchedCount` or `modifiedCount` are not available. However, `insertedId` is still returned because `ObjectId` values are generated client-side before the write is sent:

```javascript
const result = await collection.insertOne(doc, { writeConcern: { w: 0 } });
// result.acknowledged === false
// result.insertedId is a client-generated ObjectId
```

## What You Lose With w:0

- No confirmation that the server received the write
- No duplicate key error detection (a duplicate insert silently fails)
- No schema validation errors reported
- No network error detection (a lost TCP packet is invisible)
- No acknowledgment from the primary or any secondary

## What You Gain

- Minimum possible write latency (a single network send, no round trip)
- Maximum possible insert throughput
- Zero blocking on slow secondaries or network hiccups

## Appropriate Use Cases

`w:0` is appropriate for:

- **High-frequency telemetry** - application performance metrics, click tracking
- **Log shipping** - bulk log ingestion where some loss is acceptable
- **Gaming leaderboard** updates at high frequency where occasional missed updates are fine
- **IoT sensor data** from thousands of devices where a small percentage of lost readings is acceptable
- **A/B testing event tracking** where statistical significance tolerates minor data loss

## Inappropriate Use Cases

Never use `w:0` for:

- User account operations (creation, password changes)
- Financial transactions
- Inventory updates
- Any operation that triggers a downstream action on success

## Example: High-Volume Metrics Pipeline

```javascript
const { MongoClient } = require("mongodb");

async function ingestMetrics(metricsBatch) {
  const client = new MongoClient("mongodb://mongo1:27017/?replicaSet=rs0");
  await client.connect();

  const collection = client.db("telemetry").collection("metrics");

  // Fire-and-forget bulk insert
  await collection.insertMany(
    metricsBatch,
    { writeConcern: { w: 0 }, ordered: false }
  );
  // With w:0, await returns as soon as the data is sent to the socket
  // without waiting for server acknowledgment

  await client.close();
}

const batch = Array.from({ length: 1000 }, (_, i) => ({
  metric: "request_count",
  value: i,
  ts: new Date()
}));

ingestMetrics(batch);
```

## Throughput Comparison

```text
Write Concern   Throughput (approx)   Latency per op
w:0             10x baseline          ~0ms (no wait)
w:1             1x baseline           ~1ms
w:majority      0.3x baseline         ~5ms
```

Actual numbers depend on hardware, network, and document size.

## Combining w:0 With Network Errors

Because `w:0` gives no feedback, network errors are completely invisible:

```javascript
try {
  await collection.insertOne(doc, { writeConcern: { w: 0 } });
  // This always "succeeds" from the client's perspective
} catch (err) {
  // Only catches driver-level connection errors, not write failures
}
```

## Hybrid Strategy

Use `w:0` for the bulk of high-frequency writes and periodically flush with `w:1` to confirm connectivity:

```javascript
let insertCount = 0;

async function insertMetric(metric) {
  insertCount++;
  const concern = insertCount % 100 === 0 ? { w: 1 } : { w: 0 };
  await collection.insertOne(metric, { writeConcern: concern });
}
```

## Summary

Write concern `w:0` sends writes without waiting for server acknowledgment, delivering maximum throughput at the cost of all durability and error visibility. Use it exclusively for loss-tolerant, high-volume workloads like telemetry, log ingestion, and event tracking. Never use it for business-critical data. Consider a hybrid approach that occasionally checks with `w:1` to detect connectivity issues.
