# What Is Read Concern in MongoDB and Why It Matters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Consistency, Replica Set, Transaction

Description: Read concern in MongoDB controls the consistency and isolation of data returned by queries, letting you balance between performance and data accuracy.

---

## Overview

Read concern is a setting that controls what data a query returns relative to the replication state of a MongoDB deployment. By choosing the right read concern level, you decide whether your application needs the absolute latest data, majority-acknowledged data, or a point-in-time snapshot - and you accept the corresponding tradeoffs in latency and consistency.

## Available Read Concern Levels

MongoDB supports five read concern levels:

| Level | Description |
|---|---|
| `local` | Returns data from the local node with no guarantee it has been replicated |
| `available` | Lowest latency, similar to local but may return orphaned documents in sharded clusters |
| `majority` | Returns only data acknowledged by a majority of replica set members |
| `linearizable` | Guarantees the strongest consistency - reads always reflect the latest majority-committed write |
| `snapshot` | Used in multi-document transactions for a consistent snapshot of data |

## Setting Read Concern in Code

```javascript
// Node.js driver - majority read concern at the collection level
const collection = db.collection("orders", {
  readConcern: { level: "majority" }
});
const docs = await collection.find({ status: "pending" }).toArray();
```

```python
# PyMongo - setting read concern on the collection level
from pymongo import MongoClient
from pymongo.read_concern import ReadConcern

client = MongoClient("mongodb://localhost:27017")
db = client["shop"]
collection = db.get_collection(
    "orders",
    read_concern=ReadConcern("majority")
)
docs = list(collection.find({"status": "pending"}))
```

## When to Use Each Level

**`local`** - Use for read-heavy workloads where eventual consistency is acceptable, such as analytics dashboards or reporting queries. It is the default for most operations.

**`majority`** - Use when you need to avoid reading uncommitted or rolled-back data. Suitable for financial systems, inventory checks, and any scenario where consistency is critical.

**`linearizable`** - Use when you absolutely need to see the result of the latest successful write, such as leader election or distributed locking. Note: this is only available for reads against the primary, and you should always set `maxTimeMS` to avoid indefinite blocking.

**`snapshot`** - Use inside multi-document ACID transactions to ensure all reads within the transaction see a consistent point-in-time view.

## Impact on Performance

Stronger read concerns come with higher latency. `majority` returns data only from a snapshot that has been confirmed as written to a majority of members, so reads may not include the very latest writes. `linearizable` may contact the primary to verify leadership, adding round-trip overhead. For most applications, `local` (the default) is the right starting point, with `majority` reserved for critical paths.

## Read Concern and Transactions

In multi-document transactions, the session-level read concern governs all operations in the transaction:

```javascript
const session = client.startSession();
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});
// All reads inside this transaction use snapshot isolation
```

## Summary

Read concern is a powerful knob for controlling data consistency in MongoDB. Use `local` for performance-sensitive reads, `majority` for strong consistency guarantees, and `snapshot` inside transactions. Understanding these levels helps you design systems that behave correctly under replication lag, failovers, and concurrent writes.
