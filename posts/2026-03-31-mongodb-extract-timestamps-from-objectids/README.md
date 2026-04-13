# How to Extract Timestamps from ObjectIds in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, ObjectId, Timestamp, Aggregation

Description: Learn how to extract creation timestamps embedded in MongoDB ObjectIds using getTimestamp(), aggregation operators, and time-range query patterns.

---

## The Embedded Timestamp

Every MongoDB ObjectId contains a 4-byte Unix timestamp in its first 4 bytes, representing the seconds since the Unix epoch at the time of creation. This means every document with an auto-generated `_id` has a free creation timestamp - no separate `createdAt` field needed.

## Extracting Timestamps in mongosh

```javascript
const id = new ObjectId("507f1f77bcf86cd799439011");
print(id.getTimestamp()); // ISODate("2012-10-17T21:13:27.000Z")
```

For an existing document:

```javascript
const doc = db.orders.findOne({ orderId: "ORD-001" });
print(doc._id.getTimestamp());
```

## Extracting Timestamps in Aggregation Pipelines

Use `$toDate` to convert an ObjectId to a date within an aggregation:

```javascript
db.orders.aggregate([
  {
    $addFields: {
      createdAt: { $toDate: "$_id" }
    }
  },
  {
    $project: {
      orderId: 1,
      createdAt: 1,
      yearMonth: {
        $dateToString: { format: "%Y-%m", date: { $toDate: "$_id" } }
      }
    }
  }
]);
```

## Filtering by Time Using ObjectId Range Queries

Instead of querying a `createdAt` field, filter by `_id` range using crafted ObjectIds:

```javascript
function objectIdAtDate(date) {
  const seconds = Math.floor(date.getTime() / 1000);
  return new ObjectId(seconds.toString(16).padStart(8, "0") + "0000000000000000");
}

const from = objectIdAtDate(new Date("2025-01-01T00:00:00Z"));
const to   = objectIdAtDate(new Date("2025-12-31T23:59:59Z"));

db.events.find({ _id: { $gte: from, $lte: to } });
```

This approach uses the `_id` index and requires no additional index on a date field.

## Grouping Documents by Creation Month

```javascript
db.signups.aggregate([
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m",
          date: { $toDate: "$_id" }
        }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## Extracting Timestamps in Python

```python
from bson import ObjectId

doc_id = ObjectId("507f1f77bcf86cd799439011")
print(doc_id.generation_time)  # datetime with UTC timezone
```

## Limitations

The ObjectId timestamp has one-second resolution. Multiple inserts within the same second will have the same timestamp component but differ in the random and counter fields. For sub-second precision, store an explicit `createdAt` field using `new Date()`.

## Summary

MongoDB ObjectIds embed a Unix timestamp in their first 4 bytes, accessible via `getTimestamp()` or the `$toDate` aggregation operator. Leverage this for free creation-time metadata, time-range queries on `_id`, and monthly groupings - all without adding a separate date field or index.
