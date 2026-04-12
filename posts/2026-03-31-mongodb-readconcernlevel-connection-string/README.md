# How to Use the readConcernLevel Option in MongoDB Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Consistency, Connection String, Transaction

Description: Learn how to configure readConcernLevel in MongoDB connection strings to control data consistency guarantees when reading from replica sets and sharded clusters.

---

## What Is readConcernLevel?

Read concern controls the consistency and isolation level of data returned by read operations. While read preference controls where reads are routed, read concern controls how "fresh" and durable the returned data is. This distinction is critical in distributed deployments.

## Read Concern Levels

```text
local      - returns data from the queried instance, may not be majority-committed
available  - same as local for replica sets; on sharded clusters, may return orphaned docs
majority   - returns data acknowledged by a majority of the replica set
linearizable - returns data that reflects all majority-acknowledged writes before the read
snapshot   - reads from a consistent snapshot; required in transactions, also available outside since MongoDB 5.0
```

## Connection String Format

```text
mongodb://host:27017/mydb?readConcernLevel=majority
```

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

// Client-level read concern
const client = new MongoClient('mongodb://localhost:27017', {
  readConcernLevel: 'majority',
});

// Per-operation override
const db = client.db('finance');
const balance = await db.collection('accounts').findOne(
  { userId: '123' },
  { readConcern: { level: 'majority' } }
);
```

## PyMongo

```python
from pymongo import MongoClient
from pymongo.read_concern import ReadConcern

# Client-level
client = MongoClient("mongodb://localhost:27017", readConcernLevel="majority")

# Per-collection override
db = client["finance"]
collection = db.get_collection(
    "accounts",
    read_concern=ReadConcern(level="majority")
)
balance = collection.find_one({"userId": "123"})
```

## Java Driver

```java
import com.mongodb.ReadConcern;
import com.mongodb.MongoClientSettings;

MongoClientSettings settings = MongoClientSettings.builder()
    .readConcern(ReadConcern.MAJORITY)
    .build();
```

## Read Concern in Transactions

Inside multi-document transactions, the read concern is set at transaction start and applies to all reads within the transaction:

```javascript
const session = client.startSession();
await session.withTransaction(async () => {
  const db = client.db('shop');
  const order = await db.collection('orders').findOne(
    { _id: orderId },
    { session }
  );
  // ... other operations
}, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
```

## Comparing Local vs Majority

```text
local (default):
  - Fastest - no wait for replication acknowledgment
  - Data may be rolled back if primary steps down before replication
  - Best for: non-critical reads, dashboards, low-latency requirements

majority:
  - Slightly slower - data must be acknowledged by majority nodes
  - Data will never be rolled back once returned
  - Best for: financial data, inventory counts, any rollback-sensitive read
```

## linearizable Read Concern

`linearizable` provides the strongest guarantee but has a significant performance cost:

```javascript
// linearizable waits to confirm no in-flight writes affect the result
const doc = await collection.findOne(
  { _id: 'config' },
  { readConcern: { level: 'linearizable' }, maxTimeMS: 5000 }
);
```

Only use `linearizable` when you need a guarantee that no subsequent read will see stale data - for example, leader election or distributed locking scenarios.

## Summary

Use `readConcernLevel=majority` for production deployments where data correctness matters more than raw read speed. Use `local` for analytics, dashboards, and scenarios where slightly stale data is acceptable. Inside transactions, use `snapshot` to ensure a consistent view of data across all reads in the transaction.
