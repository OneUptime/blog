# How to Use Write Concern w:1 in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Write Concern, Replica Set, Durability, Performance

Description: Learn how MongoDB's write concern w:1 works, when to use it for performance-critical writes, and what durability trade-offs it introduces in replica sets.

---

## What Is Write Concern w:1?

Write concern `w:1` means that a write operation returns success as soon as the **primary** has applied the write to its in-memory data structures and acknowledged it. The operation does not wait for the write to be persisted to the on-disk journal or replicated to any secondary.

Before MongoDB 5.0, `w:1` was the implicit default write concern. Starting with MongoDB 5.0, the default write concern for replica sets and sharded clusters is `w: "majority"`. For standalone instances, `w:1` remains the effective default.

`w:1` offers high write throughput but provides limited durability guarantees compared to `w: "majority"`.

## Default Behavior

Before MongoDB 5.0, `w:1` was the default, so these were equivalent:

```javascript
db.orders.insertOne({ item: "widget", qty: 10 })

db.orders.insertOne(
  { item: "widget", qty: 10 },
  { writeConcern: { w: 1 } }
)
```

On MongoDB 5.0+ replica sets, the first command uses `w: "majority"` by default. To use `w:1`, you must specify it explicitly.

## Setting Write Concern Explicitly

At the operation level:

```javascript
db.logs.insertOne(
  { event: "user_login", userId: "u123", ts: new Date() },
  { writeConcern: { w: 1 } }
)
```

At the collection or database level via driver options:

```javascript
const collection = db.collection("logs", {
  writeConcern: { w: 1 }
});
```

At the connection string level:

```text
mongodb://mongo1:27017/myapp?w=1&replicaSet=rs0
```

## What w:1 Guarantees

With `w:1`, the primary confirms:
- The write has been received
- It has been applied to the primary's in-memory data structures
- The client can read the data from the primary immediately

What it does NOT guarantee:
- That any secondary has received the write
- That the write survives a primary crash before replication

## The Rollback Risk

If the primary crashes after acknowledging `w:1` but before replicating to any secondary:

```text
1. Write acknowledged by primary (w:1 success returned to client)
2. Primary crashes (hardware failure)
3. Secondary is elected as new primary
4. The un-replicated write is rolled back
5. Data the client thought was saved no longer exists
```

This is the key trade-off: `w:1` is fast but not crash-safe unless combined with journal durability.

## Combining w:1 With journal:true

Add `j: true` to ensure the write is in the primary's on-disk journal before acknowledgment:

```javascript
db.orders.insertOne(
  { item: "widget", qty: 10 },
  { writeConcern: { w: 1, j: true } }
)
```

With `j: true`, the write survives a primary crash and restart. However, it still does not survive a scenario where the primary crashes and a secondary is elected before the write was replicated.

## When w:1 Is Appropriate

Use `w:1` when:

- Writing high-volume, low-durability data (logs, metrics, analytics events)
- Insert throughput is more important than durability
- Data can be regenerated or replayed if lost (event sourcing patterns)
- You are writing to a standalone development instance

Avoid `w:1` alone for:
- Financial records
- User account data
- Any data where loss is unacceptable

## Throughput Comparison

```text
Write Concern    Relative Throughput   Durability
w:0              Highest (fire-forget) None
w:1              High                  Primary only
w:majority       Moderate              Majority of set
```

## Node.js Driver Example

```javascript
const { MongoClient } = require("mongodb");

async function logEvent(eventData) {
  const client = new MongoClient("mongodb://mongo1:27017/?replicaSet=rs0");
  await client.connect();

  const result = await client.db("analytics").collection("events").insertOne(
    eventData,
    { writeConcern: { w: 1 } }
  );

  console.log("Logged event:", result.insertedId);
  await client.close();
}

logEvent({ type: "pageview", url: "/home", ts: new Date() });
```

## Summary

Write concern `w:1` offers high write throughput by returning success as soon as the primary acknowledges the operation in memory. It carries a risk of data loss if the primary crashes before replication. Use it for high-volume, loss-tolerant workloads such as logging and analytics. For critical data, upgrade to `w:majority` or combine with `j: true` for on-disk journal durability on the primary.
