# How to Use $concatArrays and $setUnion in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Array, Pipeline, Expression

Description: Learn how to merge arrays with $concatArrays and combine arrays while removing duplicates with $setUnion in MongoDB aggregation pipelines.

---

## Overview

MongoDB provides two distinct operators for combining arrays in aggregation pipelines. `$concatArrays` merges arrays preserving all elements including duplicates, while `$setUnion` combines arrays and removes duplicate values. Choosing the right operator depends on whether you need to preserve duplicates.

## $concatArrays

`$concatArrays` takes an array of array expressions and returns a single concatenated array. It preserves all elements and their order, including duplicates.

```javascript
db.inventory.aggregate([
  {
    $project: {
      productId: 1,
      allTags: {
        $concatArrays: ["$primaryTags", "$secondaryTags"]
      }
    }
  }
])
```

If `primaryTags` is `["electronics", "sale"]` and `secondaryTags` is `["sale", "featured"]`, the result is `["electronics", "sale", "sale", "featured"]`.

### Concatenating with Literal Arrays

You can mix document fields and literal arrays:

```javascript
db.users.aggregate([
  {
    $project: {
      allRoles: {
        $concatArrays: ["$roles", ["viewer"]]
      }
    }
  }
])
```

This appends `"viewer"` to every user's existing roles array.

### Handling Null Values

`$concatArrays` returns `null` if any of the input arrays is `null`:

```javascript
db.profiles.aggregate([
  {
    $project: {
      combined: {
        $concatArrays: [
          { $ifNull: ["$tags", []] },
          { $ifNull: ["$labels", []] }
        ]
      }
    }
  }
])
```

Use `$ifNull` to convert null arrays to empty arrays before concatenating.

## $setUnion

`$setUnion` combines two or more arrays and returns an array containing the unique elements from all input arrays. The order of elements in the result is not guaranteed.

```javascript
db.products.aggregate([
  {
    $project: {
      productId: 1,
      uniqueTags: {
        $setUnion: ["$primaryTags", "$secondaryTags"]
      }
    }
  }
])
```

If `primaryTags` is `["electronics", "sale"]` and `secondaryTags` is `["sale", "featured"]`, the result contains `["electronics", "sale", "featured"]` (no duplicates).

### Deduplicating a Single Array

You can use `$setUnion` with a literal empty array to deduplicate a single array:

```javascript
db.events.aggregate([
  {
    $project: {
      uniqueAttendees: {
        $setUnion: ["$attendees", []]
      }
    }
  }
])
```

## Comparing $concatArrays vs $setUnion

| Feature | $concatArrays | $setUnion |
|---------|---------------|-----------|
| Preserves duplicates | Yes | No |
| Preserves order | Yes | No guarantee |
| Returns null on null input | Yes | Yes |
| Works with 2+ arrays | Yes | Yes |

## Practical Example: Building Tag Lists

```javascript
db.articles.aggregate([
  {
    $group: {
      _id: "$authorId",
      allTagsWithDuplicates: { $push: "$tags" },
    }
  },
  {
    $project: {
      flattenedTags: {
        $reduce: {
          input: "$allTagsWithDuplicates",
          initialValue: [],
          in: { $concatArrays: ["$$value", "$$this"] }
        }
      }
    }
  },
  {
    $project: {
      uniqueTags: {
        $setUnion: ["$flattenedTags", []]
      }
    }
  }
])
```

This groups all tags by author, flattens them, and then deduplicates.

## Summary

`$concatArrays` and `$setUnion` both combine arrays but serve different purposes. Use `$concatArrays` when you need to preserve all elements including duplicates and maintain order, such as when building ordered lists or combining sequential data. Use `$setUnion` when you need a unique set of values from multiple arrays, such as aggregating tags, categories, or any set-like data. Always use `$ifNull` with `$concatArrays` to avoid null propagation from missing fields.
