# How to Use $type Expression for Type Checking in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $type, BSON, Type Checking

Description: Learn how to use the $type aggregation expression in MongoDB to check and filter documents by BSON field type, enabling schema validation and data quality pipelines.

---

MongoDB is schema-flexible, meaning documents in the same collection can store different BSON types in the same field. The `$type` aggregation expression returns the BSON type name of a value, which you can use for conditional logic, filtering, and data quality reporting.

## Basic Usage

`$type` takes a single expression and returns a lowercase string representing the BSON type:

```js
db.records.aggregate([
  {
    $project: {
      fieldValue: "$score",
      fieldType: { $type: "$score" }
    }
  }
]);
```

Possible return values include: `"double"`, `"string"`, `"object"`, `"array"`, `"binData"`, `"objectId"`, `"bool"`, `"date"`, `"null"`, `"int"`, `"long"`, `"decimal"`, `"missing"`.

## Finding Documents With Mixed Types

Identify documents where a field has an unexpected type:

```js
db.users.aggregate([
  {
    $project: {
      userId: 1,
      ageType: { $type: "$age" }
    }
  },
  {
    $match: {
      ageType: { $nin: ["int", "long", "double"] }
    }
  }
]);
```

## Using $type in Conditional Logic

Choose a processing path based on the field type:

```js
db.events.aggregate([
  {
    $project: {
      normalizedTimestamp: {
        $cond: {
          if:   { $eq: [{ $type: "$timestamp" }, "string"] },
          then: { $toDate: "$timestamp" },
          else: "$timestamp"
        }
      }
    }
  }
]);
```

Handle fields that may be either a string ID or an ObjectId:

```js
db.orders.aggregate([
  {
    $project: {
      customerId: {
        $cond: {
          if:   { $eq: [{ $type: "$customerId" }, "string"] },
          then: { $toObjectId: "$customerId" },
          else: "$customerId"
        }
      }
    }
  }
]);
```

## Auditing Field Type Distribution

Count how many documents have each type for a given field:

```js
db.products.aggregate([
  {
    $group: {
      _id: { $type: "$price" },
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
]);
```

This reveals whether `price` is inconsistently stored as strings vs numbers across the collection.

## Combining $type With $switch

Handle multiple possible types for a field with `$switch`:

```js
db.records.aggregate([
  {
    $project: {
      normalizedValue: {
        $switch: {
          branches: [
            {
              case: { $eq: [{ $type: "$value" }, "string"] },
              then: { $toDouble: "$value" }
            },
            {
              case: { $in: [{ $type: "$value" }, ["int", "long"]] },
              then: { $toDouble: "$value" }
            },
            {
              case: { $eq: [{ $type: "$value" }, "double"] },
              then: "$value"
            }
          ],
          default: null
        }
      }
    }
  }
]);
```

## $type vs $isArray and $isNumber

For array and numeric checks, MongoDB provides dedicated boolean expressions that are slightly more readable:

```js
db.docs.aggregate([
  {
    $project: {
      isArrayField:  { $isArray: "$tags" },
      isNumber:      { $isNumber: "$score" },
      // Equivalent using $type:
      isArrayViaType: { $eq: [{ $type: "$tags" }, "array"] }
    }
  }
]);
```

Prefer `$isArray` and `$isNumber` when you only need boolean checks, and use `$type` when you need the specific type name.

## Summary

The `$type` aggregation expression lets you inspect BSON field types at query time, making it possible to audit schema inconsistencies, route documents through conditional processing pipelines, and report on type distributions across a collection. Combine it with `$cond` or `$switch` to build robust pipelines that handle flexible schema data gracefully.
