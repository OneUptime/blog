# How to Use $convert and Type Casting in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Type Conversion, Pipeline, Expression

Description: Learn how to cast between data types in MongoDB aggregation using $convert for flexible conversion with error handling and shorthand operators like $toInt and $toString.

---

## Overview

MongoDB's aggregation pipeline supports type conversion through the `$convert` operator and a set of shorthand conversion operators including `$toInt`, `$toString`, `$toDouble`, `$toDecimal`, `$toBool`, `$toDate`, and `$toObjectId`. These are essential for normalizing inconsistent data types stored in MongoDB's flexible schema.

## The $convert Operator

`$convert` provides the most flexibility, with explicit `to` type and optional `onError` and `onNull` handlers:

```javascript
db.records.aggregate([
  {
    $project: {
      rawValue: 1,
      numericValue: {
        $convert: {
          input: "$rawValue",
          to: "int",
          onError: -1,
          onNull: 0
        }
      }
    }
  }
])
```

Supported `to` types include `"int"`, `"long"`, `"double"`, `"decimal"`, `"string"`, `"bool"`, `"date"`, and `"objectId"`.

## $toInt - Convert to Integer

`$toInt` is shorthand for `$convert` to integer. It converts strings, doubles, booleans, and decimals to 32-bit integers:

```javascript
db.products.aggregate([
  {
    $project: {
      productId: 1,
      quantity: { $toInt: "$quantityString" },
      price: { $toInt: "$price" }
    }
  }
])
```

`"42"` becomes `42`. `3.9` becomes `3` (truncated, not rounded). `true` becomes `1`.

## $toString - Convert to String

`$toString` converts numbers, booleans, dates, and ObjectIds to their string representation:

```javascript
db.orders.aggregate([
  {
    $project: {
      orderId: { $toString: "$_id" },
      amount: 1,
      amountLabel: {
        $concat: [{ $literal: "$" }, { $toString: "$amount" }]
      }
    }
  }
])
```

## $toDouble and $toDecimal

```javascript
db.measurements.aggregate([
  {
    $project: {
      rawMeasurement: 1,
      asDouble: { $toDouble: "$rawMeasurement" },
      asDecimal: { $toDecimal: "$rawMeasurement" }
    }
  }
])
```

Use `$toDecimal` when you need precise decimal arithmetic (like financial calculations). `$toDouble` is faster but may have floating-point precision issues.

## Handling Conversion Errors

The shorthand operators like `$toInt` will throw an error on invalid input. Use `$convert` with `onError` for resilient pipelines:

```javascript
db.imports.aggregate([
  {
    $project: {
      rawAge: 1,
      age: {
        $convert: {
          input: "$rawAge",
          to: "int",
          onError: null,
          onNull: null
        }
      }
    }
  },
  {
    $match: {
      age: { $ne: null }
    }
  }
])
```

## Normalizing Mixed-Type Data

A common use case is normalizing a collection where some documents store a value as a string and others as a number:

```javascript
db.events.aggregate([
  {
    $project: {
      name: 1,
      duration: {
        $convert: {
          input: "$duration",
          to: "int",
          onError: {
            $convert: {
              input: { $trim: { input: "$duration" } },
              to: "int",
              onError: 0,
              onNull: 0
            }
          },
          onNull: 0
        }
      }
    }
  }
])
```

## Summary

`$convert`, `$toInt`, and `$toString` are MongoDB's type casting operators for aggregation pipelines. `$convert` gives full control with `onError` and `onNull` fallbacks, making it safe for untrusted input. The shorthand operators (`$toInt`, `$toString`, `$toDouble`, `$toDecimal`, etc.) are more concise but throw errors on invalid input. Use these operators to normalize data from flexible-schema collections where the same logical field may be stored as different BSON types.
