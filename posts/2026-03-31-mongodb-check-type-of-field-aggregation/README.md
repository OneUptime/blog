# How to Check the Type of a Field in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Operator

Description: Learn how to check and filter by BSON data types in MongoDB using $type in queries, $isArray, $isNumber, and $type in aggregation expressions.

---

MongoDB documents can store mixed types - a field might be a string in one document and a number in another. Detecting and acting on field types is essential for data validation, type-safe transformations, and schema analysis.

## $type in Query Filters

The `$type` query operator filters documents where a field matches a specific BSON type. You can use type numbers or alias strings:

```javascript
// Find documents where "score" is stored as a number (double, int, long, or decimal)
db.results.find({ score: { $type: "number" } });

// Find documents where "createdAt" is a Date
db.events.find({ createdAt: { $type: "date" } });

// Find documents where "value" is a string
db.data.find({ value: { $type: "string" } });
```

Common type aliases: `"double"`, `"string"`, `"object"`, `"array"`, `"binData"`, `"bool"`, `"date"`, `"null"`, `"int"`, `"long"`, `"decimal"`, `"number"` (matches all numeric types).

## Checking for Multiple Types

`$type` accepts an array of types:

```javascript
// Find documents where "id" is either int or string
db.records.find({ id: { $type: ["int", "string"] } });
```

## $type in Aggregation Expressions

In aggregation, `$type` as an expression returns the BSON type name of a value as a string:

```javascript
db.data.aggregate([
  {
    $project: {
      field: 1,
      fieldType: { $type: "$field" }
    }
  }
]);
```

Output might be `"string"`, `"int"`, `"double"`, `"array"`, `"object"`, `"bool"`, `"date"`, `"null"`, or `"missing"` (when the field does not exist).

## Conditional Logic Based on Type

Combine `$type` with `$cond` to handle fields differently based on their type:

```javascript
db.records.aggregate([
  {
    $project: {
      normalizedId: {
        $cond: {
          if: { $eq: [{ $type: "$id" }, "string"] },
          then: "$id",
          else: { $toString: "$id" }
        }
      }
    }
  }
]);
```

## Type-Specific Check Operators

MongoDB provides shorthand type-check operators for common cases:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      hasArrayTags: { $isArray: "$tags" },
      hasNumericPrice: { $isNumber: "$price" }
    }
  }
]);
```

`$isArray` returns `true` if the value is a BSON array. `$isNumber` returns `true` for int, long, double, or decimal. These are more readable than `$eq: [{ $type: "$field" }, "array"]`.

## Filtering Out Type Mismatches in Schema Validation

Find and log documents that have a field stored as the wrong type:

```javascript
db.products.aggregate([
  {
    $match: {
      $expr: { $ne: [{ $type: "$price" }, "double"] }
    }
  },
  {
    $project: {
      _id: 1,
      name: 1,
      pricetype: { $type: "$price" }
    }
  }
]);
```

## $type for Missing Fields

The `"missing"` type is returned by the aggregation `$type` expression (not the query operator) when a field does not exist in a document:

```javascript
db.users.aggregate([
  {
    $project: {
      roleType: { $type: "$role" }
    }
  }
]);
// Documents without "role" field return: { roleType: "missing" }
```

This differs from `null` - a field explicitly set to null returns `"null"`, while an absent field returns `"missing"`.

## Summary

Use the `$type` query operator to filter documents by BSON type in `find` and `$match`. Use the `$type` aggregation expression to return the type name of a field value, enabling conditional logic. Use `$isArray` and `$isNumber` as convenient shorthand for common type checks. The type `"missing"` distinguishes absent fields from null fields in aggregation.
