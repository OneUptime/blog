# How to Set Dynamic Field Names in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Document

Description: Learn how to set or write fields with dynamic names in MongoDB aggregation using $setField, $arrayToObject, and pipeline-style updates.

---

Standard MongoDB aggregation operators require literal field names in `$project` and `$addFields`. When the field name itself is dynamic - derived from data or a variable - you need `$setField` (MongoDB 5.0+) or the `$arrayToObject` pattern.

## $setField (MongoDB 5.0+)

`$setField` adds or updates a field in a document where the field name is provided as an expression, not a literal:

```javascript
db.products.aggregate([
  {
    $replaceWith: {
      $setField: {
        field: { $concat: ["metric_", "$category"] },
        input: "$$ROOT",
        value: "$score"
      }
    }
  }
]);
```

For a document with `{ category: "A", score: 42 }`, this adds field `metric_A: 42` to the document.

## $setField in $project

Use `$setField` inside `$project` to add a computed-name field alongside others:

```javascript
db.localized.aggregate([
  {
    $project: {
      _id: 1,
      enriched: {
        $setField: {
          field: { $concat: ["label_", "$lang"] },
          input: "$$ROOT",
          value: "$translatedLabel"
        }
      }
    }
  }
]);
```

## $arrayToObject for Multiple Dynamic Fields

To set multiple dynamic field names at once, build a `{ k, v }` array and use `$arrayToObject`:

```javascript
db.metrics.aggregate([
  {
    $project: {
      dynamicFields: {
        $arrayToObject: {
          $map: {
            input: "$measurements",
            as: "m",
            in: {
              k: { $concat: ["sensor_", "$$m.id"] },
              v: "$$m.value"
            }
          }
        }
      }
    }
  }
]);
```

This converts `measurements: [{ id: "T1", value: 22 }, { id: "H1", value: 60 }]` into `{ dynamicFields: { sensor_T1: 22, sensor_H1: 60 } }`.

## Persisting Dynamic Field Names with Update Pipelines

To write dynamic field names to stored documents, use an update with a pipeline. `$set` inside an update pipeline does not support dynamic names directly, but `$replaceWith` + `$mergeObjects` does:

```javascript
db.products.updateMany(
  {},
  [
    {
      $replaceWith: {
        $mergeObjects: [
          "$$ROOT",
          {
            $arrayToObject: [
              {
                k: { $concat: ["tag_", "$category"] },
                v: true
              }
            ]
          }
        ]
      }
    }
  ]
);
```

## $unsetField for Dynamic Field Removal

The companion operator `$unsetField` removes a dynamically named field:

```javascript
db.products.aggregate([
  {
    $replaceWith: {
      $unsetField: {
        field: { $concat: ["deprecated_", "$version"] },
        input: "$$ROOT"
      }
    }
  }
]);
```

## Pre-5.0 Alternative

Before `$setField`, the only option was `$arrayToObject` combined with `$objectToArray` for existing fields:

```javascript
db.products.aggregate([
  {
    $project: {
      fields: {
        $arrayToObject: {
          $concatArrays: [
            { $objectToArray: "$$ROOT" },
            [{ k: { $concat: ["new_", "$type"] }, v: "$value" }]
          ]
        }
      }
    }
  }
]);
```

## Summary

Use `$setField` (MongoDB 5.0+) to add or update a single field with a dynamic name in an aggregation pipeline. For setting multiple dynamic fields simultaneously, use `$arrayToObject` with a `$map` expression. For persistent writes, combine `$replaceWith` and `$mergeObjects` in an update pipeline. Use the companion `$unsetField` to remove dynamically named fields.
