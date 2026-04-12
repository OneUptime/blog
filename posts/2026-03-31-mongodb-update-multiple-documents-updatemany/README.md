# How to Update Multiple Documents in MongoDB with updateMany()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, updateMany, Bulk Update, Write Operation

Description: Learn how to use MongoDB's updateMany() to modify all documents matching a filter, with practical examples using $set, $inc, and $unset.

---

## What Is updateMany()

`updateMany()` applies an update to every document that matches a given filter. Unlike `updateOne()`, it does not stop after the first match. Use it for bulk field changes, data migrations, or status updates across many records.

Signature:

```javascript
db.collection.updateMany(filter, update, options)
```

## Basic Example with $set

Set a field on all documents that meet a condition:

```javascript
db.users.updateMany(
  { emailVerified: false },
  { $set: { status: "pending", updatedAt: new Date() } }
)
```

Every user where `emailVerified` is `false` gets `status` set to `"pending"`.

## Updating All Documents in a Collection

Pass an empty filter `{}` to match every document:

```javascript
db.products.updateMany(
  {},
  { $set: { currency: "USD" } }
)
```

Use this carefully - it touches every document in the collection.

## Using $inc for Bulk Increments

```javascript
db.inventory.updateMany(
  { warehouse: "east" },
  { $inc: { reorderCount: 1 } }
)
```

## Using $unset to Remove a Field from Many Documents

```javascript
db.sessions.updateMany(
  { expiresAt: { $lt: new Date() } },
  { $unset: { token: "" } }
)
```

The `""` value for `$unset` is a convention - any value works, only the key matters.

## Checking the Result

```javascript
const result = await db.collection("orders").updateMany(
  { status: "processing" },
  { $set: { status: "shipped", shippedAt: new Date() } }
);

console.log(result.matchedCount);  // total documents matched
console.log(result.modifiedCount); // documents actually changed
```

If `matchedCount` differs from `modifiedCount`, some documents already had the target values.

## Performance Considerations

`updateMany()` acquires document-level locks for each modified document. For very large updates:

- Run during off-peak hours.
- Consider batching with a cursor loop to reduce lock contention.
- Add an index on the filter field to avoid a collection scan.

```javascript
// Batched approach using find + bulkWrite
const batchSize = 1000;

while (true) {
  const docs = await db.collection("logs")
    .find({ archived: false, createdAt: { $lt: cutoffDate } })
    .limit(batchSize)
    .toArray();

  if (docs.length === 0) break;

  const ops = docs.map(doc => ({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { archived: true } }
    }
  }));

  await db.collection("logs").bulkWrite(ops);
}
```

## Common Mistakes

- Forgetting that an empty filter `{}` updates every document.
- Using `updateMany()` without an index on the filter field, causing full collection scans on large collections.
- Not wrapping bulk updates in a transaction when consistency across collections matters.

## Summary

`updateMany()` is the efficient choice for applying the same change to many MongoDB documents at once. It returns `matchedCount` and `modifiedCount` so you can verify results. For large datasets, add an index on your filter field and consider batching to keep lock contention low.
