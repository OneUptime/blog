# How to Use Write Concern w:majority in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Replica Set, Durability, Consistency

Description: Learn how MongoDB's write concern w:majority ensures writes survive primary failovers by requiring acknowledgment from most replica set members before confirming success.

---

## What Is Write Concern w:majority?

Write concern `w: "majority"` requires that a write is acknowledged by a majority of the replica set's voting members before the operation returns success to the client. The primary counts toward this majority, so in a 3-node replica set, the write must be confirmed by at least 2 nodes.

Data written with `w: "majority"` is durable - it will not be rolled back even if the current primary fails and a new primary is elected, because the new primary will already have the data.

## Setting w:majority

At the operation level:

```javascript
db.orders.insertOne(
  { orderId: "ORD-001", amount: 250.00, status: "confirmed" },
  { writeConcern: { w: "majority" } }
)
```

At the update level:

```javascript
db.accounts.updateOne(
  { _id: "ACC-001" },
  { $inc: { balance: -100 } },
  { writeConcern: { w: "majority" } }
)
```

In the connection string:

```text
mongodb://mongo1:27017/myapp?w=majority&replicaSet=rs0
```

## How It Works in a 3-Node Replica Set

```text
Client sends insertOne (w:majority)
  |
  Primary (node 1) writes data
  Primary replicates to Secondary 1 (node 2)
  Secondary 1 acknowledges
  |
  2/3 nodes acknowledged = majority reached
  |
  Primary sends success to client
```

The write to Secondary 2 (node 3) may still be in progress, but the majority threshold is already satisfied.

## Majority Calculation

```text
Replica Set Size   Majority Required
1                  1
3                  2
5                  3
7                  4
```

For a 3-member set (the most common configuration), 2 members must acknowledge before the write is confirmed.

## Durability Guarantee

With `w: "majority"`, even if the primary crashes immediately after returning success:

```text
1. Write sent with w:majority
2. Primary + 1 secondary acknowledge
3. Primary crashes
4. Secondary with the data is elected as new primary
5. No rollback - data is present on the new primary
```

This is the key advantage over `w:1`.

## Combining With j:true

Add `j: true` to explicitly require that the write is in the on-disk journal before counting an acknowledgment from each node:

```javascript
db.payments.insertOne(
  { amount: 500.00, currency: "USD" },
  { writeConcern: { w: "majority", j: true } }
)
```

Since MongoDB 3.6, with the default `writeConcernMajorityJournalDefault` replica set setting (`true`), `w: "majority"` already requires journaling from a majority of nodes. Adding explicit `j: true` ensures journal durability even if `writeConcernMajorityJournalDefault` has been set to `false`.

## Node.js Driver Example

```javascript
const { MongoClient, WriteConcern } = require("mongodb");

async function processPayment(paymentData) {
  const client = new MongoClient("mongodb://mongo1:27017/?replicaSet=rs0");
  await client.connect();

  const result = await client.db("payments").collection("transactions").insertOne(
    paymentData,
    { writeConcern: new WriteConcern("majority", 5000, true) }
    // w:majority, wtimeoutMS:5000, j:true
  );

  console.log("Payment saved:", result.insertedId);
  await client.close();
}
```

## Pairing With Read Concern majority

For fully consistent read-your-writes behavior:

```javascript
// Write with majority durability
await collection.insertOne(data, { writeConcern: { w: "majority" } });

// Read back - guaranteed to see the write
const saved = await collection.findOne(
  { _id: data._id },
  { readConcern: { level: "majority" } }
);
```

## Performance Considerations

`w: "majority"` adds latency proportional to replication lag. In a healthy replica set with low latency between nodes, this is typically 1-10ms. Under heavy write load or network issues, it can be higher.

```text
Scenario                   w:1 latency   w:majority latency
Local nodes, low load      1ms           3ms
Geo-distributed (500ms RTT)  1ms           501ms
```

## When to Use w:majority

Use `w: "majority"` for:
- Financial transactions and payments
- User account creation and updates
- Any data where loss is unacceptable
- Causal consistency requirements
- Data that triggers downstream actions

## Summary

Write concern `w: "majority"` ensures writes survive primary failures by requiring acknowledgment from most replica set members. It adds latency compared to `w:1` but provides crash-safe durability. Use it as the default for business-critical data, and combine with `j: true` and `readConcern: "majority"` for full consistency guarantees.
