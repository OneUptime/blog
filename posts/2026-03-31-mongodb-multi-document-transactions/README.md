# How to Use Multi-Document Transactions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, ACID, Database, Data Integrity

Description: A deep-dive into MongoDB multi-document transactions covering cross-collection operations, session management, retry logic, and production patterns for complex data workflows.

---

## Multi-Document vs Single-Document Operations

In MongoDB, single-document operations (insertOne, updateOne, deleteOne on one document) are always atomic. Multi-document transactions extend that atomicity to groups of operations that may span multiple documents, collections, or databases within a single replica set.

```mermaid
sequenceDiagram
    participant App
    participant Session
    participant MongoDB
    App->>Session: startSession()
    Session->>MongoDB: startTransaction
    App->>MongoDB: collection.updateOne(..., {session})
    App->>MongoDB: collection.insertOne(..., {session})
    App->>MongoDB: collection2.updateOne(..., {session})
    App->>Session: commitTransaction()
    Session->>MongoDB: Commit (all or nothing)
    MongoDB-->>App: OK
```

## Transaction Lifecycle

Every multi-document transaction follows this lifecycle:

1. Create a `ClientSession`.
2. Call `startTransaction()` on the session with desired read/write concerns.
3. Execute operations, passing the `session` to each operation.
4. Call `commitTransaction()` on success, or `abortTransaction()` on error.
5. End the session with `endSession()`.

## Cross-Collection Transaction Example

Order fulfillment: deduct inventory, create an order, and create a shipment record atomically.

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient(
  "mongodb://admin:password@127.0.0.1:27017/?authSource=admin&replicaSet=rs0"
);

async function placeOrder(customerId, productId, quantity, shippingAddress) {
  await client.connect();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const db = client.db("store");

      // Step 1: Reserve inventory
      const inventory = await db.collection("inventory").findOneAndUpdate(
        { productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { returnDocument: "after", session }
      );

      if (!inventory) {
        throw new Error(`Insufficient stock for product ${productId}`);
      }

      // Step 2: Create the order
      const orderId = new (require("mongodb").ObjectId)();
      await db.collection("orders").insertOne({
        _id: orderId,
        customerId,
        productId,
        quantity,
        unitPrice: inventory.price,
        totalPrice: inventory.price * quantity,
        status: "placed",
        placedAt: new Date()
      }, { session });

      // Step 3: Create a shipment record
      await db.collection("shipments").insertOne({
        orderId,
        customerId,
        address: shippingAddress,
        status: "pending",
        createdAt: new Date()
      }, { session });

      // Step 4: Update customer order history
      await db.collection("customers").updateOne(
        { _id: customerId },
        {
          $push: { orderHistory: { orderId, placedAt: new Date() } },
          $inc: { totalOrders: 1 }
        },
        { session }
      );

      return { orderId };
    });

    console.log("Order placed:", result.orderId);
    return result;
  } finally {
    await session.endSession();
    await client.close();
  }
}
```

## Manual Transaction Control with Retry Logic

While `withTransaction()` handles retries automatically, sometimes you need manual control. The following pattern handles the two retryable error labels defined by the MongoDB spec:

```javascript
async function runTransactionWithRetry(session, txnFunc) {
  while (true) {
    try {
      session.startTransaction();
      await txnFunc(session);
      break;
    } catch (error) {
      if (error.hasErrorLabel("TransientTransactionError")) {
        // Retry the whole transaction
        console.log("TransientTransactionError - retrying transaction");
        continue;
      }
      throw error;
    }
  }
}

async function commitWithRetry(session) {
  while (true) {
    try {
      await session.commitTransaction();
      break;
    } catch (error) {
      if (error.hasErrorLabel("UnknownTransactionCommitResult")) {
        // Retry the commit - the transaction may have committed already
        console.log("UnknownTransactionCommitResult - retrying commit");
        continue;
      }
      throw error;
    }
  }
}

async function executeTransaction() {
  const session = client.startSession();

  try {
    await runTransactionWithRetry(session, async (session) => {
      const db = client.db("myapp");
      await db.collection("A").updateOne({ _id: 1 }, { $set: { val: "x" } }, { session });
      await db.collection("B").insertOne({ ref: 1, note: "linked" }, { session });
    });

    await commitWithRetry(session);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```

## Cross-Database Transactions

Transactions can span multiple databases within the same replica set:

```javascript
await session.withTransaction(async () => {
  const appDb = client.db("appdb");
  const analyticsDb = client.db("analyticsdb");

  await appDb.collection("events").insertOne({ type: "purchase", userId: "u1" }, { session });
  await analyticsDb.collection("eventStream").insertOne({ type: "purchase", ts: new Date() }, { session });
});
```

## Transactions on Sharded Clusters

Multi-document transactions work on sharded clusters (MongoDB 4.2+). The transaction coordinator ensures all participating shards either commit or abort together (two-phase commit).

Connection string for a sharded cluster:

```javascript
const client = new MongoClient(
  "mongodb://admin:password@mongos1:27017,mongos2:27017/?authSource=admin"
);
```

Sharded transactions have additional latency due to the two-phase commit protocol. Keep them short.

## Monitoring Active Transactions

Check active and pending transactions:

```javascript
db.adminCommand({ currentOp: 1, active: true, transaction: { $exists: true } })
```

View transaction metrics from serverStatus:

```javascript
db.serverStatus().transactions
```

Output:

```text
{
  retriedCommandsCount: 5,
  retriedStatementsCount: 12,
  transactionsCollectionWriteCount: 0,
  currentActive: 2,
  currentInactive: 0,
  currentOpen: 2,
  totalAborted: 8,
  totalCommitted: 1247,
  totalStarted: 1255
}
```

## Transaction Timeout Configuration

The default maximum transaction lifetime is 60 seconds. Change it:

```javascript
db.adminCommand({ setParameter: 1, transactionLifetimeLimitSeconds: 30 })
```

Or in `mongod.conf`:

```yaml
setParameter:
  transactionLifetimeLimitSeconds: 30
```

## Common Errors and Solutions

**WriteConflict** - two transactions modified the same document simultaneously. The driver will retry automatically when using `withTransaction()`.

**NoSuchTransaction** - the transaction expired (exceeded `transactionLifetimeLimitSeconds`). Reduce transaction duration.

**OperationNotSupportedInTransaction** - operation cannot be used in a transaction (e.g., creating a collection). Create collections before starting the transaction.

**Transaction numbers are only allowed on a replica set member or mongos** - transactions require a replica set or sharded cluster; standalone instances do not support them.

## Best Practices

- Keep transactions short - aim for under 1 second; certainly under 30 seconds.
- Avoid user interaction or network calls to external services inside a transaction.
- Read documents before modifying them within the same transaction to detect conflicts early.
- Use `withTransaction()` for automatic retry and cleanup; reserve manual control for special cases.
- Pre-create all collections before starting a transaction.
- Monitor `totalAborted` in `serverStatus().transactions` - a high abort rate suggests write conflicts or slow transactions.

## Summary

MongoDB multi-document transactions let you atomically modify documents across multiple collections and databases within a single replica set or sharded cluster. Use `session.withTransaction()` for the simplest and most robust approach - it handles retries for `TransientTransactionError` and `UnknownTransactionCommitResult` automatically. Keep transactions short, pass the session to every operation, and pre-create collections. Monitor transaction health through `serverStatus().transactions`.
