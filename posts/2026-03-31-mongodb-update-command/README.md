# How to Use the update Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, Write, Operator

Description: A complete guide to MongoDB update operations - updateOne, updateMany, replaceOne, update operators, upserts, and arrayFilters for nested array element updates.

---

## updateOne and updateMany

`updateOne()` modifies the first matching document. `updateMany()` modifies all matching documents:

```javascript
// Update one document
db.orders.updateOne(
  { orderId: "ORD-001" },
  { $set: { status: "shipped" } }
);

// Update all matching documents
db.orders.updateMany(
  { status: "pending" },
  { $set: { status: "processing", updatedAt: new Date() } }
);
```

The result includes `matchedCount` and `modifiedCount`.

## Common Update Operators

```javascript
// $set - set field values
db.users.updateOne({ _id: "u1" }, { $set: { email: "new@example.com" } });

// $unset - remove a field
db.users.updateOne({ _id: "u1" }, { $unset: { temporaryToken: "" } });

// $inc - increment/decrement a number
db.products.updateOne({ _id: "P-1" }, { $inc: { stock: -1, views: 1 } });

// $mul - multiply a field
db.products.updateOne({ _id: "P-1" }, { $mul: { price: 1.1 } });

// $min / $max - update if new value is smaller/larger
db.scores.updateOne({ userId: "u1" }, { $max: { highScore: 9500 } });

// $rename - rename a field
db.users.updateMany({}, { $rename: { "fullname": "name" } });

// $currentDate - set to current date
db.sessions.updateOne(
  { sessionId: "s-001" },
  { $currentDate: { lastAccess: true } }
);
```

## replaceOne

`replaceOne()` replaces the entire document (except `_id`):

```javascript
db.products.replaceOne(
  { _id: "P-1" },
  { name: "New Widget", price: 14.99, updatedAt: new Date() }
);
```

Note: unlike `$set`, the entire document is replaced and any missing fields are removed.

## Upsert

Add `upsert: true` to insert if no document matches:

```javascript
db.pageViews.updateOne(
  { path: "/homepage" },
  {
    $inc: { count: 1 },
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true }
);
```

## Updating Array Elements

```javascript
// Update the first matching array element with $
db.carts.updateOne(
  { userId: "u1", "items.productId": "P-2" },
  { $set: { "items.$.qty": 3 } }
);

// Update all array elements with $[]
db.orders.updateMany(
  { status: "pending" },
  { $set: { "items.$[].shipped": false } }
);
```

## arrayFilters for Conditional Array Updates

```javascript
// Update only array elements where qty > 5
db.orders.updateMany(
  {},
  { $set: { "items.$[elem].priority": "high" } },
  { arrayFilters: [{ "elem.qty": { $gt: 5 } }] }
);
```

## findOneAndUpdate

Returns the document before or after the update:

```javascript
const updated = db.orders.findOneAndUpdate(
  { orderId: "ORD-001" },
  { $set: { status: "shipped" } },
  { returnNewDocument: true }
);
printjson(updated);
```

## Checking Update Results

```javascript
const result = db.orders.updateMany(
  { status: "pending" },
  { $set: { flagged: true } }
);

print(`Matched: ${result.matchedCount}`);
print(`Modified: ${result.modifiedCount}`);
print(`Upserted: ${result.upsertedCount}`);
```

## Summary

MongoDB's update commands offer granular field-level changes via operators like `$set`, `$inc`, and `$unset`, avoiding full document replacements. Use `updateMany()` for bulk changes, `upsert: true` to create-or-update, `arrayFilters` for conditional array element updates, and `findOneAndUpdate()` when you need the modified document returned atomically.
