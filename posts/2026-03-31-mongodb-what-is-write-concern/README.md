# What Is Write Concern in MongoDB and Why It Matters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Durability, Replica Set, Data Safety

Description: Write concern in MongoDB determines how many nodes must acknowledge a write before the operation returns success, directly controlling data durability and performance.

---

## Overview

Write concern is the acknowledgment level that MongoDB returns after a write operation. It tells the driver how many replica set members must confirm the write before the operation is considered successful. A higher write concern provides stronger durability guarantees at the cost of slightly higher latency.

Every write in MongoDB - inserts, updates, deletes - can be tuned with a write concern to match your application's tolerance for data loss.

## Write Concern Components

A write concern document has three fields:

- `w`: The number of nodes that must acknowledge the write (or `"majority"` for automatic quorum)
- `j`: Whether the primary must write to the journal before acknowledging
- `wtimeout`: The maximum time in milliseconds to wait for the write to propagate

```javascript
{ w: "majority", j: true, wtimeout: 5000 }
```

## Common Write Concern Levels

**`w: 0` (fire and forget)** - The driver does not wait for any acknowledgment. Maximum throughput, zero durability guarantees. Suitable for high-volume logging where an occasional lost write is acceptable.

**`w: 1`** - The primary acknowledges the write. The write is in memory but may not have replicated. If the primary crashes immediately after, the write could be lost. This was the default write concern before MongoDB 5.0. Starting with MongoDB 5.0, the default for replica sets and sharded clusters is `w: "majority"`.

**`w: "majority"`** - A majority of voting replica set members must acknowledge the write. This ensures the write survives a primary election. Recommended for production workloads.

**`w: <number>`** - A specific count of nodes must acknowledge. Useful in multi-data-center setups.

## Setting Write Concern in Code

```javascript
// Node.js - write concern on a single insertOne
const result = await db.collection("payments").insertOne(
  { amount: 150, userId: "abc" },
  { writeConcern: { w: "majority", j: true } }
);
```

```python
# PyMongo - write concern on the collection
from pymongo import MongoClient
from pymongo.write_concern import WriteConcern

client = MongoClient("mongodb://localhost:27017")
db = client["billing"]
coll = db.get_collection(
    "payments",
    write_concern=WriteConcern(w="majority", j=True)
)
coll.insert_one({"amount": 150, "userId": "abc"})
```

## The Journal Flag

Setting `j: true` means the primary must flush the write to the on-disk journal before acknowledging. This protects against data loss even if the mongod process crashes before writing to the data files. When `j` is not explicitly set, the behavior depends on the write concern level. For `w: "majority"`, journal acknowledgment is implied by default (controlled by the `writeConcernMajorityJournalDefault` replica set setting). For other write concern levels like `w: 1`, an unset `j` means the write is acknowledged once it reaches memory.

## Write Concern and Transactions

In multi-document transactions, specify write concern at the transaction level to apply it to all writes atomically:

```javascript
const session = client.startSession();
session.startTransaction({
  writeConcern: { w: "majority", j: true }
});
await coll.insertOne({ order: 1 }, { session });
await session.commitTransaction();
```

## Choosing the Right Write Concern

- **Analytics ingestion, telemetry** - `w: 0` or `w: 1` for throughput
- **User-facing features, API responses** - `w: 1` with `j: true` is a reasonable balance
- **Financial transactions, orders, payments** - `w: "majority"` with `j: true` for maximum safety
- **Multi-document transactions** - Always use `w: "majority"`

## Summary

Write concern controls how durable a MongoDB write is before the operation returns. Use `w: "majority"` with `j: true` for critical data that must not be lost, and relax it to `w: 1` or even `w: 0` for high-throughput scenarios where occasional loss is tolerable. Matching write concern to your data's importance is a key part of production MongoDB configuration.
