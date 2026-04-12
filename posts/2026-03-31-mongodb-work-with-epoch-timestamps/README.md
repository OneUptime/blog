# How to Work with Epoch Timestamps in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Date, Timestamp

Description: Learn how to store, query, and convert Unix epoch timestamps in MongoDB, and when to use them versus the native BSON Date type.

---

Epoch timestamps represent time as the number of milliseconds (or seconds) since January 1, 1970 UTC. Many systems and APIs use epoch timestamps natively, so MongoDB developers often need to store, query, and convert them.

## Epoch vs. BSON Date

MongoDB has a native BSON `Date` type that stores UTC milliseconds internally. When you use `new Date()` or `ISODate()`, MongoDB stores a proper BSON Date. Epoch timestamps as plain numbers are a different representation - both hold the same information, but BSON Dates integrate with MongoDB's date aggregation operators directly.

When data comes in as epoch integers (from a third-party API, for example), you have two choices: store as a number or convert to BSON Date on insert. Converting is almost always better for long-term query flexibility.

## Storing Epoch as Number vs. Date

Storing as a raw number:

```javascript
db.events.insertOne({
  name: "page_view",
  epochMs: 1743422400000   // milliseconds
});
```

Converting to BSON Date on insert:

```javascript
db.events.insertOne({
  name: "page_view",
  createdAt: new Date(1743422400000)  // converts epoch ms to Date
});
```

The second approach enables all date operators in aggregation. Use raw numbers only when you need maximum compatibility with external consumers that expect integer timestamps.

## Querying by Epoch Number

If you must store as numbers, range queries work the same way:

```javascript
const start = new Date("2026-03-01T00:00:00Z").getTime(); // 1772323200000
const end   = new Date("2026-04-01T00:00:00Z").getTime(); // 1775001600000

db.events.find({
  epochMs: { $gte: start, $lt: end }
});
```

## Converting Stored Epoch Numbers to BSON Dates

If you have existing documents with epoch milliseconds stored as numbers, convert them in an aggregation pipeline using `$convert` or `$toDate`:

```javascript
db.events.aggregate([
  {
    $addFields: {
      createdAt: {
        $toDate: "$epochMs"
      }
    }
  },
  {
    $project: {
      name: 1,
      createdAt: 1,
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" }
    }
  }
]);
```

To permanently migrate documents from epoch numbers to BSON Dates, run an update with an aggregation pipeline:

```javascript
db.events.updateMany(
  { epochMs: { $exists: true } },
  [
    {
      $set: {
        createdAt: { $toDate: "$epochMs" }
      }
    },
    {
      $unset: "epochMs"
    }
  ]
);
```

## Converting BSON Dates Back to Epoch

To output epoch milliseconds from a BSON Date field in an aggregation:

```javascript
db.events.aggregate([
  {
    $project: {
      name: 1,
      epochMs: {
        $toLong: "$createdAt"
      }
    }
  }
]);
```

`$toLong` converts a Date to its underlying int64 millisecond value.

For epoch seconds (common in Unix tooling), divide by 1000:

```javascript
db.events.aggregate([
  {
    $project: {
      epochSeconds: {
        $floor: {
          $divide: [{ $toLong: "$createdAt" }, 1000]
        }
      }
    }
  }
]);
```

## Indexing Epoch Timestamp Fields

Whether you store as BSON Date or integer, create an index on the field used in range queries:

```javascript
db.events.createIndex({ epochMs: 1 });
// or
db.events.createIndex({ createdAt: 1 });
```

MongoDB's B-tree indexes support range queries on both numeric and Date types efficiently.

## Summary

Prefer BSON Date over raw epoch integers in MongoDB to leverage native date operators in aggregation. When ingesting epoch data from external systems, convert to BSON Date on insert using `new Date(epochMs)`. For existing numeric fields, use `$toDate` in an aggregation pipeline to convert them. Use `$toLong` to go the other direction when epoch output is required.
