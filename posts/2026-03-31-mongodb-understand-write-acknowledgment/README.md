# How to Understand Write Acknowledgment in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Durability, Replica Set, Consistency

Description: Learn how MongoDB write acknowledgment works, what write concern levels mean, and how to choose the right durability guarantee for your application's needs.

---

## What Is Write Acknowledgment

Write acknowledgment in MongoDB is the confirmation sent from the server to the client indicating that a write operation has been received, applied, and optionally committed to a durable medium. The level of acknowledgment you require - from no response at all to confirmation from multiple replicas - is controlled by the `writeConcern` option.

Choosing the right write concern balances data durability against write latency.

## Write Concern Components

A write concern has three parts:

```text
w       - How many nodes must acknowledge the write
j       - Whether the write must be committed to the journal (WAL) on disk
wtimeout - How long to wait for acknowledgment before returning an error
```

## Common Write Concern Levels

```javascript
// w:0 - Fire and forget. No acknowledgment. Fastest but unsafe.
db.metrics.insertOne(
  { event: "pageview", ts: new Date() },
  { writeConcern: { w: 0 } }
);

// w:1 - Primary acknowledges after writing to memory
// Note: since MongoDB 5.0, the default write concern for replica sets is w:"majority"
db.orders.insertOne(
  { customerId: "u123", total: 99.99 },
  { writeConcern: { w: 1 } }
);

// w:"majority" - Majority of replica set members acknowledge
db.payments.insertOne(
  { orderId: "o456", amount: 99.99, status: "charged" },
  { writeConcern: { w: "majority", j: true } }
);

// w:2 - Exactly 2 nodes must acknowledge
db.criticalData.insertOne(
  { record: "audit-log" },
  { writeConcern: { w: 2, j: true } }
);
```

## The Journal Flag (j)

Setting `j: true` means MongoDB waits for the write to be committed to the write-ahead journal (WAL) on disk before acknowledging. Without journaling, a write acknowledged to memory could be lost if the server crashes before the next checkpoint.

```javascript
// Safe write: acknowledged after journaling on the primary
db.transactions.insertOne(
  { txId: "tx-789", amount: 500 },
  { writeConcern: { w: 1, j: true } }
);

// Safest write: majority of nodes, all journaled
db.transactions.insertOne(
  { txId: "tx-790", amount: 1500 },
  { writeConcern: { w: "majority", j: true } }
);
```

## wtimeout: Preventing Indefinite Waits

If a replica set is degraded and the required number of nodes cannot acknowledge within `wtimeout` milliseconds, MongoDB returns a write concern error. The write may still have succeeded on the primary.

```javascript
db.orders.insertOne(
  { customerId: "u999", total: 49.99 },
  { writeConcern: { w: "majority", j: true, wtimeout: 5000 } }
);
```

## Choosing the Right Write Concern

```text
w:0            - Metrics, high-frequency logging where loss is acceptable
w:1, j:false   - Best throughput, acceptable for non-critical data
w:1, j:true    - Single-node durability, balanced latency
w:majority     - Financial data, user account changes, anything that must survive failover
```

## Verifying Write Concern on Results

The result of a write operation includes write concern confirmation details:

```javascript
const result = await collection.insertOne(
  { type: "audit" },
  { writeConcern: { w: "majority" } }
);
// result.acknowledged is true for w >= 1 or w:"majority"
// For w:0 it is false. Write concern failures throw an exception.
console.log(result.acknowledged);
```

## Summary

MongoDB write acknowledgment gives you precise control over the durability guarantee for each write operation. Use `w: "majority"` with `j: true` for data that must survive replica set failovers - such as financial transactions or user data. Use lower write concerns for high-throughput, loss-tolerant workloads like analytics events. Always set `wtimeout` to prevent your application from waiting indefinitely during replica set degradation.
