# How to Tune MongoDB readConcern for Consistency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Consistency, Replication, Transaction

Description: Learn how to use MongoDB readConcern levels to control data consistency for reads, understand the tradeoffs, and choose the right level for your application.

---

## Introduction

`readConcern` in MongoDB controls the consistency and isolation of data returned by read operations. It lets you choose whether reads see the most recent data, only majority-committed data, or a snapshot-consistent view for transactions. Choosing the right `readConcern` level is essential for correctness in distributed deployments.

## readConcern Levels

```mermaid
graph TD
    subgraph Levels["readConcern Levels (increasing consistency)"]
        L1["local - Returns most recent data on the queried node\n(may be rolled back)"]
        L2["available - Like local but no causally consistent sessions\n(for sharded clusters, may return orphaned docs)"]
        L3["majority - Returns only data acknowledged by majority\n(crash-safe, cannot be rolled back)"]
        L4["linearizable - Strongest consistency, real-time ordering\n(reads from primary only, slowest)"]
        L5["snapshot - Point-in-time snapshot for multi-doc transactions"]
    end
    L1 --> L2 --> L3 --> L4
```

## Default Behavior

Without specifying `readConcern`, MongoDB uses `local` as the default for all read operations, including standalone, replica set, and sharded cluster deployments.

## local readConcern

Returns the most recent data available on the queried node. Data may be rolled back if the node was a primary that stepped down without a majority of nodes acknowledging the write.

```javascript
db.orders.find(
  { status: "pending" }
).readConcern("local").toArray()

// Same as the default
db.orders.find({ status: "pending" }).toArray()
```

Use `local` for: high-throughput reads where stale data is acceptable and rollback risk is low (e.g., analytics, counters).

## majority readConcern

Returns only data that has been acknowledged by a majority of replica set members. This data can never be rolled back.

```javascript
db.orders.find(
  { orderId: "ORD-1001" }
).readConcern("majority").toArray()
```

In Node.js driver:

```javascript
const result = await db.collection("orders").findOne(
  { orderId: "ORD-1001" },
  { readConcern: { level: "majority" } }
)
```

Use `majority` for: financial records, inventory counts, or anything where reading a rolled-back value would cause a business error.

## linearizable readConcern

Guarantees that the read reflects all successful majority-acknowledged writes that completed before the start of the read operation, from any client. Always reads from the primary and may wait for in-progress majority writes to propagate.

```javascript
db.accounts.find(
  { accountId: "ACC-7777" }
).readConcern("linearizable").maxTimeMS(10000).next()
```

**Important**: Always set `maxTimeMS` with `linearizable` to prevent the operation from hanging if the primary is unavailable.

Use `linearizable` for: read-modify-write patterns where you must see the latest committed state, such as account balance checks before debiting.

## snapshot readConcern (Multi-Document Transactions)

Provides a point-in-time snapshot consistent across all documents in a transaction:

```javascript
const session = db.getMongo().startSession()
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
})

try {
  const sessionDb = session.getDatabase("ecommerce")
  const order = sessionDb.orders.findOne({ orderId: "ORD-1001" })
  const product = sessionDb.inventory.findOne({ productId: order.productId })

  // Both reads see the same snapshot - consistent view
  sessionDb.inventory.updateOne(
    { productId: order.productId },
    { $inc: { stock: -order.quantity } }
  )

  session.commitTransaction()
} catch (e) {
  session.abortTransaction()
  throw e
} finally {
  session.endSession()
}
```

## Setting Default readConcern

Set a cluster-wide default:

```javascript
db.adminCommand({
  setDefaultRWConcern: 1,
  defaultReadConcern: { level: "majority" },
  writeConcern: { w: "majority" }
})
```

Verify the default:

```javascript
db.adminCommand({ getDefaultRWConcern: 1 })
```

## readConcern vs readPreference

These two are complementary:

| Setting | Controls |
|---|---|
| `readConcern` | Which data (committed to how many members) is returned |
| `readPreference` | Which replica set member to read from |

Example combining both:

```javascript
// Read majority-committed data from the nearest member (primary or secondary)
db.collection("events").find(
  { type: "purchase" },
  {
    readConcern: { level: "majority" },
    readPreference: "nearest"
  }
)
```

Note: `readConcern: majority` on secondaries returns the most recent majority-committed data as of that secondary's state.

## Causal Consistency

Use causal sessions to guarantee that reads always see your own writes, even when reading from secondaries:

```javascript
const session = db.getMongo().startSession({ causalConsistency: true })
const sessionDb = session.getDatabase("ecommerce")

// Write
sessionDb.orders.insertOne({ orderId: "ORD-9999", status: "created" })

// Read from secondary - guaranteed to see the above write
const order = sessionDb.orders.find(
  { orderId: "ORD-9999" }
).readConcern("majority").readPref("secondary").next()
```

## Performance Implications

| Level | Latency | Throughput | Notes |
|---|---|---|---|
| local | Lowest | Highest | Default, some rollback risk |
| available | Lowest | Highest | Sharded only, may see orphans |
| majority | Medium | Medium | Safe from rollback |
| linearizable | Highest | Lowest | Single primary reads only |
| snapshot | Varies | Varies | Transactions only |

## Summary

MongoDB's `readConcern` controls data consistency for read operations. Use `local` for high-throughput scenarios where slight staleness is acceptable, `majority` for financial or inventory data that must never reflect rolled-back writes, and `linearizable` for the strongest real-time consistency guarantees. Always pair `linearizable` with `maxTimeMS`. For multi-document atomic operations, use `snapshot` within a transaction. Set a cluster-wide default with `setDefaultRWConcern` to enforce consistency policies across your application.
