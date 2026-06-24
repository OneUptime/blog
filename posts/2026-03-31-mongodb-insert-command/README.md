# How to Use the insert Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Insert, Write, Document

Description: Learn how to insert documents in MongoDB using insertOne, insertMany, and bulkWrite with ordered and unordered modes, write concerns, and error handling patterns.

---

## insertOne

`insertOne()` inserts a single document and returns the inserted `_id`:

```javascript
const result = db.orders.insertOne({
  customerId: "CUST-001",
  items: [{ productId: "P-1", qty: 2, price: 19.99 }],
  total: 39.98,
  status: "pending",
  createdAt: new Date()
});

print(result.insertedId); // ObjectId("...")
```

If no `_id` is provided, MongoDB auto-generates an `ObjectId`.

## insertOne with Custom _id

```javascript
db.products.insertOne({
  _id: "PROD-SKU-001",
  name: "Widget",
  price: 9.99,
  inStock: true
});
```

## insertMany

`insertMany()` inserts multiple documents in a single network round-trip:

```javascript
const result = db.products.insertMany([
  { name: "Widget A", price: 9.99,  category: "tools" },
  { name: "Widget B", price: 14.99, category: "tools" },
  { name: "Gadget",   price: 49.99, category: "electronics" }
]);

print(result.insertedCount); // 3
printjson(result.insertedIds);
```

## Ordered vs Unordered Inserts

By default, `insertMany()` is ordered - it stops on the first error. Use `ordered: false` to continue inserting even when some documents fail:

```javascript
try {
  db.users.insertMany([
    { _id: "u1", name: "Alice" },
    { _id: "u1", name: "Duplicate" }, // will fail
    { _id: "u2", name: "Bob" }        // with ordered:false, this still inserts
  ], { ordered: false });
} catch (err) {
  // err.result contains info on succeeded and failed inserts
  print(`Inserted: ${err.result.insertedCount}`);
  printjson(err.writeErrors);
}
```

## Write Concern

Control durability guarantees with write concern:

```javascript
// Majority acknowledgment - waits for primary + majority of secondaries
db.orders.insertOne(
  { orderId: "ORD-100", amount: 250 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
);

// Unacknowledged - fire and forget (not recommended for production)
db.analytics.insertOne(
  { event: "click", ts: new Date() },
  { writeConcern: { w: 0 } }
);
```

## Inserting Inside a Transaction

```javascript
const session = db.getMongo().startSession();
session.startTransaction();

try {
  db.orders.insertOne({ orderId: "ORD-200", total: 100 }, { session });
  db.inventory.updateOne(
    { productId: "P-1" },
    { $inc: { qty: -1 } },
    { session }
  );
  session.commitTransaction();
} catch (err) {
  session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

## Checking for Duplicate Key Errors

```javascript
try {
  db.users.insertOne({ _id: "existing-id", name: "Test" });
} catch (err) {
  if (err.code === 11000) {
    print("Duplicate key error - document already exists");
  } else {
    throw err;
  }
}
```

## Upsert Pattern (Insert if Not Exists)

```javascript
db.settings.updateOne(
  { key: "theme" },
  { $setOnInsert: { key: "theme", value: "dark", createdAt: new Date() } },
  { upsert: true }
);
```

## Summary

Use `insertOne()` for single documents and `insertMany()` for bulk inserts. Set `ordered: false` on `insertMany()` to continue past errors. Apply write concern for durability guarantees, handle duplicate key errors with code `11000`, and use `$setOnInsert` with upserts when you need insert-only logic without modifying existing documents.
