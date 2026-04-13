# How to Use Read Preferences with Transactions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Transaction, Read Preference, Replica Set, Consistency

Description: Learn why MongoDB transactions require primary read preference and how to structure your code to separate transactional from secondary reads.

---

## Read Preferences and Transactions

MongoDB transactions on replica sets only support `primary` read preference. All read operations inside a transaction must go to the primary node. Attempting to use `secondary`, `secondaryPreferred`, or `nearest` inside a transaction will result in an error.

```text
MongoServerError: Read preference in a transaction must be primary
```

## Why Only Primary Is Allowed

Transactions use a consistent snapshot read concern that requires point-in-time consistency. Since secondaries may lag behind the primary, reading from a secondary inside a transaction would break the snapshot guarantee. The primary is the only node guaranteed to have all committed data.

## Correct Transaction Setup

```javascript
const session = client.startSession();
try {
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" }
    // No readPreference needed - primary is enforced automatically
  });

  const orders = client.db("shop").collection("orders");
  const inventory = client.db("shop").collection("inventory");

  const item = await inventory.findOne(
    { productId: "PROD-001" },
    { session }
  );

  if (item.stock > 0) {
    await orders.insertOne({ productId: "PROD-001", qty: 1 }, { session });
    await inventory.updateOne(
      { productId: "PROD-001" },
      { $inc: { stock: -1 } },
      { session }
    );
  }

  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  await session.endSession();
}
```

## Separating Transactional from Read Replica Queries

The restriction means you should keep transaction scope minimal and move non-critical reads outside the transaction where secondary reads are fine.

```javascript
// Outside the transaction - can use secondary for heavy analytics reads
const report = await db.collection("orders")
  .aggregate([/* aggregation pipeline */], { readPreference: "secondary" })
  .toArray();

// Inside the transaction - only for the atomic write portion
const session = client.startSession();
await session.withTransaction(async () => {
  await db.collection("inventory").updateOne(
    { productId },
    { $inc: { reserved: 1 } },
    { session }
  );
  await db.collection("carts").insertOne({ productId, userId }, { session });
});
await session.endSession();
```

## Checking Read Preference at Runtime

You can verify what read preference is active on a session:

```javascript
const session = client.startSession();
session.startTransaction();
// Read preference is automatically "primary" inside a transaction
// Any other setting is overridden
```

## Distributing Non-Transactional Reads

To scale read traffic, use secondary reads outside transactions:

```javascript
const collection = db.collection("products");

// Route catalog browsing to secondary
const products = await collection
  .find({ category: "electronics" }, { readPreference: "secondaryPreferred" })
  .toArray();

// Only use transaction for checkout
await session.withTransaction(async () => {
  await placeOrder(session, cart);
});
```

## Summary

MongoDB transactions enforce `primary` read preference because snapshot isolation requires a single consistent point-in-time view only available on the primary. Design your application to perform heavy read-replica queries outside transactions and keep transaction scope limited to the operations that genuinely need atomicity.
