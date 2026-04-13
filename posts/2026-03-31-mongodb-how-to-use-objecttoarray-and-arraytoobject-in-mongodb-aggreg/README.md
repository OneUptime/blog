# How to Use $objectToArray and $arrayToObject in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $objectToArray, $arrayToObject, Object, Array

Description: Learn how to convert objects to arrays and arrays back to objects in MongoDB aggregation using $objectToArray and $arrayToObject operators.

---

## Overview

MongoDB's `$objectToArray` and `$arrayToObject` operators allow you to convert between object (document) structures and array representations. These are especially powerful when working with dynamic field names or when you need to apply array operators to object fields.

## $objectToArray - Convert an Object to an Array

`$objectToArray` converts a document into an array of `{k, v}` pairs where `k` is the field name and `v` is the value.

```javascript
db.inventory.insertOne({
  item: "widget",
  prices: {
    USD: 9.99,
    EUR: 8.50,
    GBP: 7.75
  }
})

db.inventory.aggregate([
  {
    $project: {
      item: 1,
      priceArray: { $objectToArray: "$prices" }
    }
  }
])
// Result: { item: "widget", priceArray: [{k:"USD",v:9.99},{k:"EUR",v:8.50},{k:"GBP",v:7.75}] }
```

## $arrayToObject - Convert an Array Back to an Object

`$arrayToObject` converts an array of `{k, v}` pairs (or two-element `[key, value]` arrays) back into a document.

```javascript
// From {k, v} pair format
db.demo.aggregate([
  {
    $project: {
      reconstructed: {
        $arrayToObject: [
          { k: "host", v: "localhost" },
          { k: "port", v: 27017 }
        ]
      }
    }
  }
])
// Result: { reconstructed: { host: "localhost", port: 27017 } }

// From [[key, value]] format
db.demo.aggregate([
  {
    $project: {
      reconstructed: {
        $arrayToObject: [["host", "localhost"], ["port", 27017]]
      }
    }
  }
])
```

## Practical Example - Summing Dynamic Currency Values

Use `$objectToArray` to apply `$sum` across dynamic fields:

```javascript
db.sales.insertMany([
  { region: "North", revenue: { Jan: 1000, Feb: 1200, Mar: 900 } },
  { region: "South", revenue: { Jan: 800, Feb: 950, Mar: 1100 } }
])

db.sales.aggregate([
  {
    $project: {
      region: 1,
      totalRevenue: {
        $sum: {
          $map: {
            input: { $objectToArray: "$revenue" },
            as: "month",
            in: "$$month.v"
          }
        }
      }
    }
  }
])
```

## Filtering Object Fields Dynamically

Remove fields from a document by converting to array, filtering, then converting back:

```javascript
db.users.aggregate([
  {
    $project: {
      cleaned: {
        $arrayToObject: {
          $filter: {
            input: { $objectToArray: "$$ROOT" },
            as: "field",
            cond: {
              $not: [ { $in: ["$$field.k", ["password", "ssn", "_id"]] } ]
            }
          }
        }
      }
    }
  }
])
```

## Transforming Keys Across a Document

Uppercase all field names in a nested object:

```javascript
db.config.aggregate([
  {
    $project: {
      upperConfig: {
        $arrayToObject: {
          $map: {
            input: { $objectToArray: "$settings" },
            as: "pair",
            in: {
              k: { $toUpper: "$$pair.k" },
              v: "$$pair.v"
            }
          }
        }
      }
    }
  }
])
```

## Real-World Example - Pivoting Data

Combine `$group` with `$objectToArray` and `$arrayToObject` for pivoting:

```javascript
// Given: { product: "A", month: "Jan", sales: 100 }
// Goal: { product: "A", Jan: 100, Feb: 200 }

db.monthlySales.aggregate([
  {
    $group: {
      _id: "$product",
      monthlySales: {
        $push: { k: "$month", v: "$sales" }
      }
    }
  },
  {
    $project: {
      product: "$_id",
      salesByMonth: { $arrayToObject: "$monthlySales" }
    }
  }
])
```

## Summary

`$objectToArray` converts a document into an array of key-value pairs, enabling you to use array operators on object fields. `$arrayToObject` performs the inverse conversion, reconstructing a document from an array of pairs. Together they are essential for working with dynamic schemas, pivoting data, filtering fields programmatically, and transforming nested document structures in aggregation pipelines.
