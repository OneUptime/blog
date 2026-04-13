# How to Find Duplicate Documents in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Duplicate, Query, Index

Description: Learn how to find duplicate documents in MongoDB based on one or more fields using aggregation $group and $match with $gt count filtering.

---

Finding duplicate documents is a common data quality task. MongoDB does not have a built-in deduplication command, but the aggregation pipeline makes it straightforward to identify duplicates based on any combination of fields.

## Basic Duplicate Detection with $group

Group by the field(s) that define a duplicate, count occurrences, and filter for counts greater than one:

```javascript
// Find duplicate email addresses
db.users.aggregate([
  {
    $group: {
      _id: "$email",
      count: { $sum: 1 },
      ids: { $push: "$_id" }
    }
  },
  {
    $match: {
      count: { $gt: 1 }
    }
  }
])
```

Sample output:

```json
[
  {
    "_id": "user@example.com",
    "count": 3,
    "ids": ["64a1...", "64b2...", "64c3..."]
  }
]
```

## Duplicates Across Multiple Fields

To define a duplicate as matching on several fields:

```javascript
// Find duplicate (firstName, lastName) combinations
db.contacts.aggregate([
  {
    $group: {
      _id: {
        firstName: "$firstName",
        lastName: "$lastName"
      },
      count: { $sum: 1 },
      docs: { $push: "$$ROOT" }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  },
  { $sort: { count: -1 } }
])
```

## Collecting Full Document Details

Use `$$ROOT` to push entire documents into the output:

```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$sku",
      count: { $sum: 1 },
      duplicates: { $push: "$$ROOT" }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  },
  {
    $project: {
      sku: "$_id",
      count: 1,
      duplicates: 1,
      _id: 0
    }
  }
])
```

## Count Total Duplicate Records

To get a summary of how many duplicate records exist:

```javascript
db.users.aggregate([
  {
    $group: {
      _id: "$email",
      count: { $sum: 1 }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  },
  {
    $group: {
      _id: null,
      totalDuplicateGroups: { $sum: 1 },
      totalDuplicateRecords: { $sum: "$count" }
    }
  }
])
```

## Deleting Duplicates (Keep One)

After finding duplicates, remove all but the first (lowest ObjectId):

```javascript
db.users.aggregate([
  { $sort: { _id: 1 } },
  {
    $group: {
      _id: "$email",
      ids: { $push: "$_id" },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 1 } } }
]).forEach(group => {
  // Keep the first id (lowest ObjectId), delete the rest
  const [keep, ...remove] = group.ids;
  db.users.deleteMany({ _id: { $in: remove } });
})
```

## Preventing Future Duplicates with Unique Index

After cleaning duplicates, enforce uniqueness with an index:

```javascript
db.users.createIndex({ email: 1 }, { unique: true })
```

For case-insensitive uniqueness:

```javascript
db.users.createIndex(
  { email: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 }
  }
)
```

## Summary

To find duplicate documents in MongoDB, use `$group` to aggregate by the fields defining uniqueness, collect `_id` values with `$push`, and filter with `$match` where count is greater than one. After identifying and removing duplicates, add a unique index to prevent recurrence. For large collections, run the aggregation with `allowDiskUse: true` to avoid memory constraints.
