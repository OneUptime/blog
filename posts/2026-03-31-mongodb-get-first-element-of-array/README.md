# How to Get the First Element of an Array in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array, Aggregation

Description: Learn how to retrieve the first element of an array in MongoDB using $arrayElemAt, $first, dot notation, and aggregation pipeline operators.

---

Accessing the first element of an array is a common need - whether you want the most recent event, the primary tag, or the first item in an ordered list. MongoDB provides multiple approaches depending on whether you are querying, projecting, or aggregating.

## Dot Notation for Projection (index 0)

In a simple query projection, use dot notation with index `0` to retrieve only the first element:

```javascript
// Return only the first tag of each product
db.products.find({}, { "tags.0": 1, name: 1 });
```

Note: this projects the field but still returns the array wrapper in the result. The document will look like `{ name: "Widget", tags: ["electronics"] }`.

## $arrayElemAt in Aggregation

In an aggregation pipeline, `$arrayElemAt` returns a single element (not wrapped in an array) at a given index. Index `0` is the first element:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      firstTag: { $arrayElemAt: ["$tags", 0] }
    }
  }
]);
```

The result is a scalar value, not an array: `{ name: "Widget", firstTag: "electronics" }`.

## $first Accumulator in $group

When using a `$group` stage, `$first` returns the first value seen in the group from a field:

```javascript
db.orders.aggregate([
  { $sort: { placedAt: 1 } },
  {
    $group: {
      _id: "$customerId",
      firstOrder: { $first: "$orderId" },
      firstOrderDate: { $first: "$placedAt" }
    }
  }
]);
```

Always sort before grouping when using `$first` so that "first" is deterministic.

## $first as Array Operator (MongoDB 5.0+)

In `$project` or `$addFields`, `$first` can also operate on an array field directly (not just as a group accumulator):

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      primaryTag: { $first: "$tags" }
    }
  }
]);
```

This is equivalent to `{ $arrayElemAt: ["$tags", 0] }` and is more readable.

## Handling Empty Arrays

When the array might be empty, `$arrayElemAt` returns null rather than throwing an error:

```javascript
db.products.aggregate([
  {
    $project: {
      primaryTag: {
        $ifNull: [
          { $arrayElemAt: ["$tags", 0] },
          "untagged"
        ]
      }
    }
  }
]);
```

`$ifNull` replaces null with a default value when the array is empty or the field is missing.

## Getting the First N Elements

To get the first N elements (a slice), use `$slice`:

```javascript
// In aggregation
db.products.aggregate([
  {
    $project: {
      firstThreeTags: { $slice: ["$tags", 3] }
    }
  }
]);

// In a find query projection
db.products.find({}, { tags: { $slice: 3 } });
```

Positive values slice from the start; negative values slice from the end.

## Summary

Use `$first` (MongoDB 5.0+ as an expression) or `$arrayElemAt` with index `0` to extract the first array element as a scalar in aggregation pipelines. Use `$slice: 1` for projection when you need the first element wrapped in an array. Always handle empty arrays with `$ifNull` to avoid null results in downstream pipeline stages.
