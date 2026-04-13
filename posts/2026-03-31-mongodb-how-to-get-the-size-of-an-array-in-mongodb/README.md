# How to Get the Size of an Array in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array, $size, Aggregation, Query

Description: Learn how to get the size of an array field in MongoDB using $size in queries and aggregation, with examples for filtering by array length and computed sizes.

---

## Introduction

MongoDB provides multiple ways to get the size of an array field. The `$size` operator in queries matches documents where an array has a specific length, while `$size` in aggregation returns the count of elements. For range queries on array size, you can use `$expr` with the aggregation `$size` operator or a stored size field. This guide covers all approaches with practical examples.

## Getting Array Size in Aggregation

Use `$size` in a `$project` stage to add the array length as a new field:

```javascript
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      itemCount: { $size: "$items" }
    }
  }
]);
```

Sample output:

```javascript
{ _id: ObjectId("..."), orderId: "ORD-001", itemCount: 3 }
{ _id: ObjectId("..."), orderId: "ORD-002", itemCount: 7 }
```

## Matching Documents Where Array Has Exact Size

In a query, `$size` matches documents where the array has exactly N elements:

```javascript
// Find orders with exactly 3 items
db.orders.find({ items: { $size: 3 } });

// Find users with no followers
db.users.find({ followers: { $size: 0 } });
```

## Filtering by Array Size in Aggregation

Use `$size` in a `$match` stage for aggregation filtering:

```javascript
db.orders.aggregate([
  {
    $match: {
      $expr: { $gt: [{ $size: "$items" }, 5] }
    }
  }
]);
```

The `$expr` operator allows aggregation expressions inside `$match`.

## Range Queries on Array Length

MongoDB's query `$size` only supports exact matches - not ranges. Use `$expr` with `$size` for range comparisons:

```javascript
// Find documents where array has more than 3 elements
db.posts.find({
  $expr: { $gt: [{ $size: "$tags" }, 3] }
});

// Find documents where array has between 2 and 5 elements
db.posts.find({
  $expr: {
    $and: [
      { $gte: [{ $size: "$tags" }, 2] },
      { $lte: [{ $size: "$tags" }, 5] }
    ]
  }
});
```

## Using a Stored Size Field for Indexed Range Queries

For frequent range queries on array length, maintain a computed size field that can be indexed:

```javascript
// On insert, store the array size
db.posts.insertOne({
  title: "My Post",
  tags: ["mongodb", "database", "nosql"],
  tagCount: 3  // Stored explicitly
});

// Create an index on the stored size
db.posts.createIndex({ tagCount: 1 });

// Query efficiently with index
db.posts.find({ tagCount: { $gte: 5 } });
```

Keep the stored field in sync using update pipeline:

```javascript
db.posts.updateOne(
  { _id: postId },
  [
    { $set: { tags: { $concatArrays: ["$tags", ["newtag"]] } } },
    { $set: { tagCount: { $size: "$tags" } } }
  ]
);
```

## Handling Null and Missing Array Fields

`$size` throws an error if the field is not an array. Use `$ifNull` to handle missing fields:

```javascript
db.users.aggregate([
  {
    $project: {
      name: 1,
      followerCount: {
        $size: { $ifNull: ["$followers", []] }
      }
    }
  }
]);
```

Or filter for documents where the field exists:

```javascript
db.users.find({ followers: { $exists: true, $type: "array" } });
```

## Group Documents by Array Size

Count how many documents have arrays of each size:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: { $size: "$items" },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

Output:

```javascript
{ _id: 1, count: 245 }
{ _id: 2, count: 412 }
{ _id: 3, count: 189 }
```

## Getting Size of Nested Array

For a nested array (array within an array element), use `$map` with `$size`:

```javascript
db.courses.aggregate([
  {
    $project: {
      courseName: 1,
      moduleLessonCounts: {
        $map: {
          input: "$modules",
          as: "module",
          in: {
            moduleName: "$$module.name",
            lessonCount: { $size: "$$module.lessons" }
          }
        }
      }
    }
  }
]);
```

## Summary

Use `$size` in aggregation `$project` stages to compute array lengths as fields, and in `$match` with `$expr` for range-based filtering on array length. The query-level `$size` operator only supports exact equality checks. For performance-critical range queries on array length, store a computed size field and index it. Always protect `$size` from null inputs using `$ifNull` to prevent pipeline errors on documents with missing array fields.
