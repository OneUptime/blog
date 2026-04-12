# How to Remove Duplicate Elements from an Array in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Array, Aggregation

Description: Learn how to deduplicate array elements in MongoDB using $setUnion, $reduce, and aggregation pipeline techniques.

---

Duplicate elements in arrays can cause incorrect counts, redundant processing, and data quality issues. MongoDB provides several ways to deduplicate array elements - both in aggregation pipelines and in stored documents.

## $setUnion for Deduplication

`$setUnion` returns an array of unique values from one or more arrays. It is the fastest way to deduplicate because it is a single operator:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      uniqueTags: { $setUnion: ["$tags", []] }
    }
  }
]);
```

The `[]` is a second empty array - `$setUnion` accepts two or more arrays and merges them with deduplication. Using `["$tags", []]` deduplicates `$tags` without adding new elements.

Note: `$setUnion` does not guarantee element order in the result.

## Deduplicating and Merging Two Arrays

`$setUnion` also merges two arrays while removing duplicates across both:

```javascript
db.products.aggregate([
  {
    $project: {
      allUniqueTags: { $setUnion: ["$primaryTags", "$secondaryTags"] }
    }
  }
]);
```

## Persisting Deduplicated Arrays with an Update

To permanently overwrite an array field with its deduplicated version, use an update with an aggregation pipeline:

```javascript
db.products.updateMany(
  {},
  [
    {
      $set: {
        tags: { $setUnion: ["$tags", []] }
      }
    }
  ]
);
```

The `[...]` array syntax in `updateMany` enables pipeline-style updates that can reference the current document.

## $reduce for Order-Preserving Deduplication

`$setUnion` does not preserve original element order. If order matters, use `$reduce` with a manual uniqueness check:

```javascript
db.products.aggregate([
  {
    $project: {
      orderedUniqueTags: {
        $reduce: {
          input: "$tags",
          initialValue: [],
          in: {
            $cond: {
              if: { $in: ["$$this", "$$value"] },
              then: "$$value",
              else: { $concatArrays: ["$$value", ["$$this"]] }
            }
          }
        }
      }
    }
  }
]);
```

This iterates the array and appends each element only if it has not been seen before, preserving insertion order.

## Deduplicating Arrays of Subdocuments

For arrays of embedded documents, deduplication by a specific field requires `$reduce` since `$setUnion` performs deep equality on entire subdocuments. Use `$map` to extract the key field from the accumulator before checking with `$in`:

```javascript
db.orders.aggregate([
  {
    $project: {
      uniqueProducts: {
        $reduce: {
          input: "$lineItems",
          initialValue: [],
          in: {
            $cond: {
              if: {
                $in: [
                  "$$this.productId",
                  { $map: { input: "$$value", as: "v", in: "$$v.productId" } }
                ]
              },
              then: "$$value",
              else: { $concatArrays: ["$$value", ["$$this"]] }
            }
          }
        }
      }
    }
  }
]);
```

The `$map` extracts `productId` from each subdocument already in the accumulator (`$$value`), producing a flat array of IDs that `$in` can search. Without `$map`, `$in` would not reliably match against a nested field within an array of subdocuments.

## Summary

Use `$setUnion: ["$field", []]` for fast, concise deduplication when element order does not matter. Use `$reduce` with a `$cond` and `$in` check when insertion order must be preserved. For subdocuments, extract the key field with `$map` before checking for duplicates.
