# How to Concatenate Arrays in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array, Aggregation, Concatenation, Pipeline

Description: Learn how to concatenate multiple arrays in MongoDB aggregation using $concatArrays and combine array fields from different documents.

---

## Overview

MongoDB's `$concatArrays` operator joins two or more arrays into a single array within an aggregation pipeline. This is useful for merging array fields, combining results from multiple sources, or building unified lists.

## Basic $concatArrays

```javascript
db.users.aggregate([
  {
    $project: {
      allTags: {
        $concatArrays: ["$primaryTags", "$secondaryTags"]
      }
    }
  }
]);
```

## Concatenating a Literal Array with a Field

You can mix field references and literal arrays.

```javascript
db.products.aggregate([
  {
    $project: {
      allCategories: {
        $concatArrays: [["default"], "$categories"]
      }
    }
  }
]);
```

## Handling Null or Missing Arrays

If either operand is null or missing, `$concatArrays` returns null. Use `$ifNull` to provide a fallback.

```javascript
db.users.aggregate([
  {
    $project: {
      allPermissions: {
        $concatArrays: [
          { $ifNull: ["$rolePermissions", []] },
          { $ifNull: ["$customPermissions", []] }
        ]
      }
    }
  }
]);
```

## Concatenating After $group

After grouping, combine arrays from multiple documents.

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      productLists: { $push: "$items" }
    }
  },
  {
    $project: {
      allProducts: {
        $reduce: {
          input: "$productLists",
          initialValue: [],
          in: { $concatArrays: ["$$value", "$$this"] }
        }
      }
    }
  }
]);
```

## Deduplicating After Concatenation

Combine `$concatArrays` with `$setUnion` to get unique values.

```javascript
db.users.aggregate([
  {
    $project: {
      uniqueTags: {
        $setUnion: ["$systemTags", "$userTags"]
      }
    }
  }
]);
```

## Counting the Merged Array

Get the length of the concatenated result.

```javascript
db.users.aggregate([
  {
    $project: {
      totalPermissions: {
        $size: {
          $concatArrays: [
            { $ifNull: ["$rolePermissions", []] },
            { $ifNull: ["$customPermissions", []] }
          ]
        }
      }
    }
  }
]);
```

## Summary

`$concatArrays` joins multiple arrays in MongoDB aggregation pipelines. Guard against null fields using `$ifNull`, and combine with `$setUnion` to deduplicate merged arrays. For flattening nested arrays after a `$group`, use `$reduce` with `$concatArrays` as the accumulator.
