# How to Group Documents by a Field and Count in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $group, $count, Aggregation, Grouping

Description: Learn how to use MongoDB's aggregation pipeline with $group and $sum to count documents grouped by one or more fields.

---

## Overview

Grouping documents and counting occurrences is one of the most common aggregation operations in MongoDB. The `$group` stage with the `$sum` accumulator is the standard approach.

## Basic Group and Count

```javascript
// Count orders by status
db.orders.aggregate([
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
]);

// Result
// { "_id": "pending", "count": 142 }
// { "_id": "shipped", "count": 287 }
// { "_id": "cancelled", "count": 45 }
```

## Sort by Count

```javascript
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

## Filter Before Grouping

Use `$match` before `$group` to count within a subset:

```javascript
// Count orders by status for orders placed in 2026
db.orders.aggregate([
  {
    $match: {
      createdAt: {
        $gte: new Date("2026-01-01"),
        $lt: new Date("2027-01-01")
      }
    }
  },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
]);
```

## Count All Documents

To count the total number of documents in a collection:

```javascript
// Count matching documents (runs an aggregation internally)
db.orders.countDocuments({ status: "pending" });

// Or via aggregation
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $count: "total" }
]);
```

## Group by Nested Field

Use dot notation to group by a field inside an embedded document:

```javascript
// Count users by city
db.users.aggregate([
  {
    $group: {
      _id: "$address.city",
      userCount: { $sum: 1 }
    }
  },
  { $sort: { userCount: -1 } }
]);
```

## Group by Multiple Fields

```javascript
// Count orders by status AND category
db.orders.aggregate([
  {
    $group: {
      _id: { status: "$status", category: "$category" },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.status": 1, count: -1 } }
]);
```

## Group by Date Parts

Count documents per day, month, or year:

```javascript
// Count orders per day
db.orders.aggregate([
  {
    $group: {
      _id: {
        year:  { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day:   { $dayOfMonth: "$createdAt" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
]);

// Simpler using $dateToString
db.orders.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Rename _id in Results

Use `$project` to rename `_id` to something meaningful:

```javascript
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } },
  {
    $project: {
      status: "$_id",
      count: 1,
      _id: 0
    }
  },
  { $sort: { count: -1 } }
]);
```

## Node.js Example

```javascript
async function countByStatus(db) {
  const results = await db.collection("orders").aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { status: "$_id", count: 1, _id: 0 } }
  ]).toArray();

  return results;
}
```

## Summary

Group and count in MongoDB is achieved with the `$group` aggregation stage using `{ $sum: 1 }` as the accumulator. Place a `$match` stage before `$group` to filter the dataset, add a `$sort` stage after for ordered results, and use `$project` to rename `_id` to a more descriptive field name. For date-based grouping, use `$dateToString` or date extraction operators like `$year`, `$month`, and `$dayOfMonth`.
