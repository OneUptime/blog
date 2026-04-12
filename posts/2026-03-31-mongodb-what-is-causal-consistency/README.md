# What Is Causal Consistency in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Causal Consistency, Session, Replica Set, Distributed System

Description: Causal consistency in MongoDB ensures that operations in a session are executed in order, so a read always reflects the results of earlier writes in the same session.

---

## Overview

In a distributed database, different nodes may apply operations at slightly different times. Without causal consistency, a client that writes a value and then immediately reads it may get back stale data from a secondary that hasn't replicated the write yet. Causal consistency solves this by tracking a causal ordering of operations within a session, guaranteeing that your reads always reflect your own writes.

MongoDB introduced causally consistent sessions in version 3.6. When enabled, the driver attaches logical timestamps (called cluster time and operation time) to each operation so the server can enforce ordering.

## The Four Causal Guarantees

A causally consistent session in MongoDB provides:

1. **Read your own writes** - After a write, any subsequent reads in the same session will see that write.
2. **Monotonic reads** - Reads in a session never return older data than a previous read in the same session.
3. **Monotonic writes** - Writes in a session are applied in the order they are issued.
4. **Writes follow reads** - If a session reads data and then writes based on it, the write is guaranteed to happen after the read it observed.

## Enabling Causal Consistency

Causal consistency is scoped to a session. It is enabled by default when you start a session, but you can pass the option explicitly for clarity:

```javascript
// Node.js - start a causally consistent session
const session = client.startSession({ causalConsistency: true });

try {
  // Write
  await db.collection("inventory").updateOne(
    { sku: "widget-42" },
    { $inc: { qty: -1 } },
    { session }
  );

  // Read - guaranteed to see the above write
  const item = await db.collection("inventory").findOne(
    { sku: "widget-42" },
    { session }
  );
  console.log(item.qty);
} finally {
  session.endSession();
}
```

```python
# PyMongo - causally consistent session
with client.start_session(causal_consistency=True) as session:
    db["inventory"].update_one(
        {"sku": "widget-42"},
        {"$inc": {"qty": -1}},
        session=session
    )
    item = db["inventory"].find_one(
        {"sku": "widget-42"},
        session=session
    )
    print(item["qty"])
```

## Cluster Time and Operation Time

Under the hood, MongoDB uses two logical clocks:

- **Cluster time** - A logical timestamp representing the state of the cluster
- **Operation time** - The timestamp of the last operation completed in the session

The driver piggybacks these values on every operation. When issuing a read after a write, the driver tells the server "don't return results until you have applied operations up to at least this operation time." If a secondary hasn't caught up yet, the read waits until replication catches up or until `maxTimeMS` is exceeded.

## Causal Consistency vs. Transactions

Causal consistency guarantees ordering across operations in a session but does not provide atomicity across multiple documents. For multi-document atomicity, use multi-document transactions. You can combine both - a transaction inside a causally consistent session gets both guarantees.

## Performance Considerations

Causal consistency adds a small overhead because the server must enforce ordering. If a secondary is behind, reads may block until it catches up. For workloads where eventual consistency is acceptable (dashboards, analytics), you may not need causal consistency. Reserve it for flows where a user must see the result of their own recent action.

## Summary

Causal consistency in MongoDB ensures that operations within a session execute in a logically ordered sequence, so reads always reflect previous writes in the same session. Enable it via `startSession({ causalConsistency: true })` for flows like user profile updates, shopping carts, or any scenario where "read your own writes" is a correctness requirement.
