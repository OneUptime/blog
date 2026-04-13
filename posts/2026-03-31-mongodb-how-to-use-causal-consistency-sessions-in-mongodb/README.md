# How to Use Causal Consistency Sessions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Causal Consistency, Session, Distributed System, Replica Set

Description: Learn how to use causally consistent sessions in MongoDB to guarantee that reads always reflect your own writes in distributed deployments.

---

## What Is Causal Consistency

In a distributed database, a read issued immediately after a write may land on a secondary that has not yet replicated the write. Causal consistency is a guarantee that within a session, operations are always observed in causal order - a read will never return data older than what was last written in that same session.

MongoDB implements causal consistency through operation times and cluster times attached to each session. Secondaries use these times to wait for the required oplog entries before serving reads.

## Requirements

Causal consistency requires:
- MongoDB 3.6 or later
- A replica set or sharded cluster (not a standalone)
- Read concern `majority` or `snapshot` on reads
- Write concern `majority` on writes within the session

## Starting a Causally Consistent Session

### Node.js

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017/?replicaSet=rs0");
await client.connect();

const session = client.startSession({ causalConsistency: true });
const db = client.db("myApp");

try {
  // Write with majority write concern
  await db.collection("accounts").updateOne(
    { userId: "user123" },
    { $inc: { balance: -100 } },
    { session, writeConcern: { w: "majority" } }
  );

  // Read with majority read concern - guaranteed to see the write above
  const account = await db.collection("accounts").findOne(
    { userId: "user123" },
    { session, readConcern: { level: "majority" } }
  );

  console.log("Balance after debit:", account.balance);
} finally {
  session.endSession();
  await client.close();
}
```

### Python (PyMongo)

```python
from pymongo import MongoClient, WriteConcern, ReadConcern

client = MongoClient("mongodb://localhost:27017/?replicaSet=rs0")
db = client["myApp"]

with client.start_session(causal_consistency=True) as session:
    coll = db.get_collection(
        "accounts",
        write_concern=WriteConcern("majority"),
        read_concern=ReadConcern("majority")
    )

    coll.update_one(
        {"userId": "user123"},
        {"$inc": {"balance": -100}},
        session=session
    )

    account = coll.find_one(
        {"userId": "user123"},
        session=session
    )
    print("Balance:", account["balance"])
```

## Propagating Causal Consistency Across Services

You can pass the operation time from one session to another, even across microservices:

```javascript
// Service A - writes data and returns the operation time
const sessionA = client.startSession({ causalConsistency: true });
await db.collection("orders").insertOne(
  { orderId: "ORD-001", status: "created" },
  { session: sessionA, writeConcern: { w: "majority" } }
);
const operationTime = sessionA.operationTime;
const clusterTime = sessionA.clusterTime;
sessionA.endSession();

// Pass operationTime and clusterTime to Service B (e.g., via HTTP header)

// Service B - advances its session to guarantee it sees Service A's writes
const sessionB = client.startSession({ causalConsistency: true });
sessionB.advanceOperationTime(operationTime);
sessionB.advanceClusterTime(clusterTime);

const order = await db.collection("orders").findOne(
  { orderId: "ORD-001" },
  { session: sessionB, readConcern: { level: "majority" } }
);
console.log(order.status); // "created" - guaranteed
sessionB.endSession();
```

## When to Use Causal Consistency

Use causally consistent sessions when:
- A user writes data and immediately reads it back (profile updates, shopping cart)
- Multiple services must observe writes in order
- You use secondary reads to reduce primary load but cannot tolerate stale reads for your own operations

Avoid it when:
- You are reading historical data with no dependency on recent writes
- Latency is critical and eventual consistency is acceptable

## Performance Considerations

Causal consistency with `readConcern: majority` requires secondaries to wait for the operationTime to be applied before returning results. This adds latency compared to unconstrained secondary reads. Use it only in the code paths that actually need the guarantee.

## Summary

Causally consistent sessions in MongoDB ensure that reads within a session always reflect the session's own writes, even when reads hit secondaries. By starting a session with `causalConsistency: true` and pairing writes with `writeConcern: majority` and reads with `readConcern: majority`, you get a predictable, ordered view of data. Operation times can be passed across service boundaries to extend this guarantee to distributed workflows.
