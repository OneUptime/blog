# How to Remove Duplicates from a MongoDB Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Duplicate, Aggregation, Data Cleaning, $group

Description: Learn how to find and remove duplicate documents from a MongoDB collection using aggregation pipelines, keeping the first or newest occurrence.

---

## Introduction

Duplicate documents occur in MongoDB when data is inserted multiple times without a unique constraint, during data migration, or from bugs in application logic. Removing duplicates requires identifying which documents to keep, deleting the rest, and preventing future duplicates with a unique index. This guide covers several strategies for different scenarios.

## Step 1 - Identify Duplicate Fields

First, find which fields have duplicates using aggregation:

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$email",
      count: { $sum: 1 },
      ids: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } },
  { $sort: { count: -1 } }
]);
```

Output:

```javascript
{ _id: "alice@example.com", count: 3, ids: [ObjectId("..."), ObjectId("..."), ObjectId("...")] }
{ _id: "bob@example.com", count: 2, ids: [ObjectId("..."), ObjectId("...")] }
```

## Step 2 - Remove Duplicates, Keep Newest

Keep the document with the latest `_id` (ObjectId timestamps embed insertion order) and delete the rest:

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$email",
      count: { $sum: 1 },
      latestId: { $max: "$_id" },
      allIds: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } }
]).forEach((group) => {
  // Remove all IDs except the latest one
  const idsToRemove = group.allIds.filter(
    (id) => id.toString() !== group.latestId.toString()
  );
  db.users.deleteMany({ _id: { $in: idsToRemove } });
  print(`Removed ${idsToRemove.length} duplicates for ${group._id}`);
});
```

## Step 3 - Keep Oldest Document Instead

Keep the document with the earliest insertion (smallest `_id`):

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$email",
      count: { $sum: 1 },
      oldestId: { $min: "$_id" },
      allIds: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } }
]).forEach((group) => {
  const idsToRemove = group.allIds.filter(
    (id) => id.toString() !== group.oldestId.toString()
  );
  db.users.deleteMany({ _id: { $in: idsToRemove } });
});
```

## Removing Duplicates by Multiple Fields

When uniqueness is defined by a combination of fields:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: { customerId: "$customerId", productId: "$productId", date: "$date" },
      count: { $sum: 1 },
      latestId: { $max: "$_id" },
      allIds: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } }
]).forEach((group) => {
  const idsToRemove = group.allIds.filter(
    (id) => id.toString() !== group.latestId.toString()
  );
  db.orders.deleteMany({ _id: { $in: idsToRemove } });
});
```

## Batch Processing for Large Collections

For large collections, process duplicates in batches to avoid memory issues:

```javascript
const cursor = db.users.aggregate(
  [
    {
      $group: {
        _id: "$email",
        count: { $sum: 1 },
        latestId: { $max: "$_id" },
        allIds: { $push: "$_id" }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ],
  { allowDiskUse: true }
);

let totalRemoved = 0;
while (cursor.hasNext()) {
  const group = cursor.next();
  const idsToRemove = group.allIds.filter(
    (id) => id.toString() !== group.latestId.toString()
  );
  db.users.deleteMany({ _id: { $in: idsToRemove } });
  totalRemoved += idsToRemove.length;
}

print(`Total duplicates removed: ${totalRemoved}`);
```

## Preventing Future Duplicates with Unique Index

After cleaning up, create a unique index to prevent future duplicates:

```javascript
// Create unique index on email field
db.users.createIndex({ email: 1 }, { unique: true });

// Compound unique index
db.orders.createIndex(
  { customerId: 1, productId: 1, date: 1 },
  { unique: true }
);
```

If duplicates still exist when creating the index, MongoDB will reject the index creation. You must remove all duplicates first using the techniques above before creating the unique index.

## Preview Changes Before Deleting

Before deleting, preview which documents will be removed:

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$email",
      count: { $sum: 1 },
      latestId: { $max: "$_id" },
      allIds: { $push: "$_id" }
    }
  },
  { $match: { count: { $gt: 1 } } },
  { $limit: 5 }
]).forEach((group) => {
  print(`Email: ${group._id}, Duplicates: ${group.count - 1}`);
  print(`  Keeping: ${group.latestId}`);
  print(`  Removing: ${group.allIds.filter(id => id.toString() !== group.latestId.toString())}`);
});
```

## Summary

Removing MongoDB duplicates requires a three-step process: identify duplicate groups using `$group` with `$push` to collect all IDs, delete all but the desired document (newest or oldest) per group, and then create a unique index to prevent recurrence. For large collections, use `allowDiskUse: true` in the aggregation and process in batches. Always preview the deletion plan before executing to avoid data loss.
