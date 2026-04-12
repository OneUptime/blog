# How to Understand Read Isolation in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Read Concern, Consistency, Transaction, Isolation

Description: Learn how MongoDB read isolation works through read concern levels, what data each level guarantees, and how to choose the right isolation for your queries.

---

## What Is Read Isolation

Read isolation in MongoDB controls what data a read operation can see - specifically, whether it can see data that has not yet been fully committed or replicated. MongoDB implements read isolation through the `readConcern` option, which can be set per-operation, per-session, or at the client level.

Understanding read isolation prevents your application from acting on uncommitted, rolled-back, or non-durable data.

## Read Concern Levels

MongoDB provides five read concern levels:

```text
local        - Returns the most recent data on the primary (default)
available    - Returns data regardless of replication state (fastest, lowest guarantee)
majority     - Returns only data acknowledged by a majority of the replica set
linearizable - Returns data that reflects all prior acknowledged writes
snapshot     - Returns data consistent to a specific point in time (primarily used in transactions)
```

## local Read Concern (Default)

`local` returns the most recently written data on the primary, even if that data has not yet been replicated to secondaries. Data seen with `local` could be rolled back in a failover scenario.

```javascript
// local is the default - returns latest data on primary
const order = await collection.findOne(
  { _id: orderId },
  { readConcern: { level: "local" } }
);
```

## majority Read Concern

`majority` returns only data that has been acknowledged by a majority of replica set members. This data will not be rolled back even in a failover scenario, providing a stronger durability guarantee.

```javascript
const payment = await collection.findOne(
  { txId: "tx-123" },
  { readConcern: { level: "majority" } }
);
```

Use `majority` when your application cannot tolerate reading data that might be rolled back.

## linearizable Read Concern

`linearizable` provides the strongest isolation guarantee. It waits for all prior write acknowledgments to be reflected before returning data, ensuring that the read reflects the most up-to-date state.

```javascript
const balance = await collection.findOne(
  { accountId: "acc-456" },
  { readConcern: { level: "linearizable" }, maxTimeMS: 5000 }
);
```

This is the most expensive option due to additional server coordination. Always set `maxTimeMS` with `linearizable` to prevent indefinite waits.

## snapshot Read Concern in Transactions

The `snapshot` level is primarily used within multi-document transactions to provide a consistent view of the database at the transaction start time. Starting in MongoDB 5.0, `snapshot` read concern is also available outside of transactions for `find`, `aggregate`, and `distinct` operations.

```javascript
const session = client.startSession();

session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" }
});

try {
  const account = await accounts.findOne({ _id: "acc-1" }, { session });
  const balance = await balances.findOne({ accountId: "acc-1" }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
} finally {
  await session.endSession();
}
```

## Choosing the Right Read Concern

```text
Analytics / reporting     -> local (freshest data, rollback risk acceptable)
Financial balances        -> majority (data will not be rolled back)
Coordination / locks      -> linearizable (most up-to-date, highest cost)
Multi-document operations -> snapshot (primarily within transactions)
```

## Summary

MongoDB read isolation via `readConcern` lets you trade read latency for data consistency guarantees. The default `local` concern returns the most recent data but may include uncommitted writes that could be rolled back. Use `majority` for reads where rollback safety matters. Use `linearizable` when you need the absolute latest committed data. Use `snapshot` within transactions for consistent multi-document reads. Always set `maxTimeMS` on `linearizable` reads to bound their latency impact.
