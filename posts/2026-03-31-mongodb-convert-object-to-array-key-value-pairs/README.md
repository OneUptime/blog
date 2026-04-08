# How to Convert an Object to an Array of Key-Value Pairs in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Document

Description: Learn how to convert a MongoDB document or subdocument into an array of key-value pairs using $objectToArray for dynamic field processing.

---

MongoDB's `$objectToArray` operator transforms a document into an array of `{ k, v }` objects, where `k` is the field name and `v` is the value. This is the foundation for working with documents that have dynamic or unknown field names.

## Basic $objectToArray Usage

```javascript
db.configs.aggregate([
  {
    $project: {
      fields: { $objectToArray: "$settings" }
    }
  }
]);
```

If `settings` is `{ theme: "dark", language: "en", timezone: "UTC" }`, the result is:

```json
[
  { "k": "theme", "v": "dark" },
  { "k": "language", "v": "en" },
  { "k": "timezone", "v": "UTC" }
]
```

## Converting the Root Document

To convert the entire document (including `_id`) to key-value pairs, use `$$ROOT`:

```javascript
db.products.aggregate([
  {
    $project: {
      _id: 1,
      allFields: { $objectToArray: "$$ROOT" }
    }
  }
]);
```

This is useful for document inspection or when you need to iterate over all fields generically.

## Iterating Over Dynamic Keys

After converting to an array, use `$map` or `$filter` to process fields whose names you do not know in advance:

```javascript
// Find all fields with numeric values greater than 100
db.metrics.aggregate([
  {
    $project: {
      highMetrics: {
        $filter: {
          input: { $objectToArray: "$values" },
          as: "field",
          cond: { $gt: ["$$field.v", 100] }
        }
      }
    }
  }
]);
```

## Unwind and Process

Unwind the `{ k, v }` array to work with each field as a separate document:

```javascript
db.configs.aggregate([
  {
    $project: {
      fields: { $objectToArray: "$settings" }
    }
  },
  { $unwind: "$fields" },
  {
    $group: {
      _id: "$fields.k",
      values: { $addToSet: "$fields.v" },
      docCount: { $sum: 1 }
    }
  }
]);
```

This aggregates how many documents use each setting key and what values appear.

## Renaming Keys Dynamically

Transform the key names while converting:

```javascript
db.products.aggregate([
  {
    $project: {
      attributes: {
        $map: {
          input: { $objectToArray: "$specs" },
          as: "field",
          in: {
            name: "$$field.k",
            value: "$$field.v"
          }
        }
      }
    }
  }
]);
```

This converts `{ k: "color", v: "blue" }` to `{ name: "color", value: "blue" }`.

## Round-Trip: $objectToArray then $arrayToObject

You can transform key-value pairs and reconstruct:

```javascript
db.products.aggregate([
  {
    $project: {
      newSpecs: {
        $arrayToObject: {
          $map: {
            input: { $objectToArray: "$specs" },
            as: "field",
            in: {
              k: { $toUpper: "$$field.k" },
              v: "$$field.v"
            }
          }
        }
      }
    }
  }
]);
```

This converts all spec field names to uppercase and reconstructs the document.

## Summary

`$objectToArray` converts a document to a `[{ k, v }]` array for dynamic field iteration, filtering by value, or remapping keys. Use it when field names are not known at query time. Pair with `$arrayToObject` to reconstruct after transformation, and with `$unwind` and `$group` for cross-document field analysis.
