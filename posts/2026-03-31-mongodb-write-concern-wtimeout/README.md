# How to Configure Write Concern with wtimeout in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Timeout, Replica Set, Performance

Description: Learn how to configure MongoDB's wtimeout to prevent write operations from blocking indefinitely when replica set members are slow or unavailable.

---

## What Is wtimeout?

`wtimeout` (write timeout) is a parameter of MongoDB's write concern that sets the maximum time in milliseconds to wait for the write concern to be satisfied. If the write concern is not met within this time, MongoDB returns an error to the client.

Without `wtimeout`, a write with `w: "majority"` on a degraded replica set could block indefinitely. `wtimeout` is your safety valve.

## The Problem Without wtimeout

Consider a 3-node replica set where one secondary goes down:

```text
w: majority required (2 of 3 nodes)
Primary acknowledges...
Secondary 1 is unreachable (network partition)
Secondary 2 eventually acknowledges

Without wtimeout: write may block for minutes waiting for secondary 1
With wtimeout: write returns error after the configured timeout
```

## Setting wtimeout

Specify `wtimeout` alongside the write concern:

```javascript
db.orders.insertOne(
  { orderId: "ORD-001", amount: 150 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)
```

`wtimeout` is specified in milliseconds. Here `5000` means 5 seconds.

In the connection string:

```text
mongodb://mongo1:27017/myapp?w=majority&wtimeoutMS=5000&replicaSet=rs0
```

## What Happens on Timeout

When `wtimeout` expires before the write concern is satisfied, MongoDB returns a `WriteConcernError` (not a write failure). Critically, the write may still have succeeded on the nodes that did acknowledge:

```javascript
try {
  await collection.insertOne(doc, {
    writeConcern: { w: "majority", wtimeout: 2000 }
  });
} catch (err) {
  if (err.result && err.result.writeConcernErrors) {
    // The write may have partially succeeded!
    // Check err.result.n and err.result.insertedId
    console.log("Write concern timeout. Write may still be committed.");
    console.log("Inserted ID:", err.result.insertedId);
  }
}
```

The write is NOT automatically rolled back on timeout. The data remains on the nodes that acknowledged it and will replicate eventually.

## Timeout vs. Write Failure

```text
Type                  Meaning
writeConcernError     Write succeeded but acknowledgment took too long
writeError            Write failed (duplicate key, validation, etc.)
```

A `wtimeout` error is a `writeConcernError`, not a `writeError`. The document likely exists in the database.

## Node.js Driver Example

```javascript
const { MongoClient, WriteConcern } = require("mongodb");

async function saveOrder(order) {
  const client = new MongoClient("mongodb://mongo1:27017/?replicaSet=rs0");
  await client.connect();

  try {
    const result = await client
      .db("store")
      .collection("orders")
      .insertOne(order, {
        writeConcern: new WriteConcern("majority", 5000, true)
        // w:"majority", wtimeoutMS:5000, j:true
      });
    console.log("Order saved:", result.insertedId);
  } catch (err) {
    if (err.code === 64) {
      // Error code 64 is WriteConcernFailed
      console.error("Write concern failed - check replica set health");
    } else {
      throw err;
    }
  } finally {
    await client.close();
  }
}
```

## Choosing the Right wtimeout Value

```text
Scenario                           Suggested wtimeout
Single datacenter replica set      1000-5000 ms
Multi-region replica set           10000-30000 ms
High-availability critical write   5000 ms with retry logic
Batch insert pipeline              No wtimeout (or very large value)
```

## wtimeout Does Not Apply to w:0 or w:1 (local)

`wtimeout` is only meaningful when `w` is greater than 1 or set to `"majority"`. For `w: 1`, the primary responds immediately, so timeout is irrelevant. For `w: 0`, there is no acknowledgment at all.

## Monitoring for wtimeout Errors

Track `writeConcernErrors` in your application metrics. A spike in `wtimeout` errors indicates replica set health problems - typically high replication lag, a downed secondary, or network partitioning.

You can alert on these via `serverStatus`:

```javascript
const status = db.adminCommand({ serverStatus: 1 });
print("Write concern timeouts:", status.metrics.getLastError.wtimeouts);
print("Write concern wait time (ms):", status.metrics.getLastError.wtime.totalMillis);
```

For detailed tracking, use `$currentOp` or your APM tool to monitor write latency percentiles.

## Summary

`wtimeout` prevents write operations from blocking indefinitely when the desired write concern cannot be met within a reasonable time. Configure it alongside `w: "majority"` to protect application responsiveness during replica set degradation. Remember that a `wtimeout` error means the write concern was not confirmed within the window - the write itself may still have committed on the acknowledging nodes and will replicate eventually.
