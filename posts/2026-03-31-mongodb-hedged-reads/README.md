# How to Use Hedged Reads in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Preference, Performance, Latency, Sharding

Description: Learn how MongoDB hedged reads send parallel read requests to multiple nodes and return the first response, reducing tail latency in sharded cluster workloads.

---

## What Are Hedged Reads?

Hedged reads is a MongoDB feature where a `mongos` sends a read request to two eligible nodes simultaneously and returns whichever response arrives first. The slower response is discarded. This technique reduces tail latency (p99, p999) at the cost of slightly higher server CPU and network usage.

Hedged reads are a sharded cluster feature - they operate on `mongos` routers and are not applicable to direct replica set connections.

## The Tail Latency Problem

Without hedged reads, a single slow node causes the entire query to be slow:

```text
mongos sends read to shard 1, secondary A
- 95% of requests: 5ms response
- 5% of requests: 200ms response (due to GC, disk IO, etc.)

p99 latency: 200ms
```

With hedged reads:

```text
mongos sends read to shard 1, secondary A AND secondary B simultaneously
- First response (from either) is used
- Probability that BOTH are slow simultaneously: 0.05 * 0.05 = 0.25%

p99 latency: ~5ms
```

## Enabling Hedged Reads

Hedged reads are only available on `mongos` with read preferences that allow secondary reads. Enable them in the read preference:

```javascript
db.products.find({ category: "electronics" }).readPref("nearest", null, {
  hedge: { enabled: true }
})
```

For `nearest` read preference, hedged reads are enabled by default on `mongos` since MongoDB 4.4. For other compatible read preferences, enable hedging programmatically through the driver.

In the Node.js driver:

```javascript
const { MongoClient, ReadPreference } = require("mongodb");

const readPref = new ReadPreference(
  "nearest",
  null,
  {
    hedge: { enabled: true },
    maxStalenessSeconds: 90
  }
);

const client = new MongoClient("mongodb://mongos1:27017,mongos2:27017/myapp", {
  readPreference: readPref
});
```

## Compatible Read Preferences

Hedged reads work with read preferences that can select secondaries:

```text
primary             Not compatible (hedged requires 2 eligible nodes)
primaryPreferred    Compatible (may hedge between primary and secondary)
secondary           Compatible
secondaryPreferred  Compatible
nearest             Compatible (most commonly used with hedged reads)
```

## How mongos Implements Hedging

When hedging is enabled:

1. `mongos` identifies two eligible nodes based on the read preference
2. It sends the read to both simultaneously
3. The first response is returned to the client
4. A `killCursors` command is sent to the slower node to clean up

The client sees only one response and is unaware of the dual request.

## Verifying Hedged Reads Are Active

Check `serverStatus` on `mongos` for hedged read metrics:

```javascript
db.adminCommand({ serverStatus: 1 }).hedgingMetrics
```

Response example:

```json
{
  "hedgingMetrics": {
    "numTotalOperations": 10000,
    "numTotalHedgedOperations": 8750,
    "numAdvantageouslyHedgedOperations": 312
  }
}
```

- `numTotalHedgedOperations` - reads where a hedge was actually sent
- `numAdvantageouslyHedgedOperations` - reads where the hedged (secondary) response came back first

## Cost of Hedged Reads

Hedging has trade-offs:

```text
Benefit                     Cost
Reduced tail latency        ~1.x read load on selected nodes
Better p99 user experience  Slightly higher network bandwidth
                            CPU cost of killing slow cursors
```

For most workloads, the latency reduction is worth the overhead. Monitor your secondary read load after enabling hedging.

## Example: Product Catalog Service

A product catalog API where users expect fast responses but the data changes slowly:

```javascript
const catalogClient = new MongoClient(mongosUri, {
  readPreference: new ReadPreference("nearest", null, {
    hedge: { enabled: true },
    maxStalenessSeconds: 300
  })
});

app.get("/products/:category", async (req, res) => {
  const products = await catalogClient
    .db("store")
    .collection("products")
    .find({ category: req.params.category })
    .limit(20)
    .toArray();
  res.json(products);
});
```

## Summary

Hedged reads reduce tail latency by sending duplicate read requests to two eligible nodes and returning the faster response. They are most effective on sharded clusters using `"nearest"` or `"secondary"` read preferences where multiple candidates exist. Use them for latency-sensitive user-facing reads on slowly changing data, and monitor `hedgingMetrics` in `serverStatus` to measure the impact on your workload.
