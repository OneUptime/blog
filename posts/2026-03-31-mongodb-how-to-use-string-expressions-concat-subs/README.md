# How to Use String Expressions in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, String Expressions, Database

Description: Learn how to use $concat, $substr, $toUpper, and $toLower string expressions in MongoDB aggregation pipelines to manipulate and transform text fields.

---

## Overview

MongoDB aggregation pipelines provide a comprehensive set of string operators that let you manipulate text fields directly in your queries. The `$concat`, `$substr`, `$toUpper`, and `$toLower` operators are among the most commonly used for building computed fields, formatting output, and normalizing data.

## Using $concat to Join Strings

The `$concat` operator joins multiple strings into a single string. It accepts an array of string expressions.

```javascript
db.users.aggregate([
  {
    $project: {
      fullName: {
        $concat: ["$firstName", " ", "$lastName"]
      },
      email: 1
    }
  }
])
```

You can also mix literals and field references:

```javascript
db.products.aggregate([
  {
    $project: {
      label: {
        $concat: ["SKU-", "$sku", " (", "$category", ")"]
      }
    }
  }
])
```

If any argument is null, `$concat` returns null. Use `$ifNull` to provide fallback values.

## Using $substr and $substrCP for Substrings

MongoDB provides `$substr` (byte-based) and `$substrCP` (code-point-based, for Unicode) to extract portions of strings. The arguments are the string, start index, and length.

```javascript
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      prefix: { $substrCP: ["$orderId", 0, 3] },
      suffix: { $substr: ["$orderId", 3, -1] }
    }
  }
])
```

Extract the year from a date-formatted string:

```javascript
db.events.aggregate([
  {
    $project: {
      eventCode: 1,
      year: { $substrCP: ["$eventCode", 0, 4] },
      month: { $substrCP: ["$eventCode", 4, 2] }
    }
  }
])
```

## Using $toUpper and $toLower for Case Conversion

The `$toUpper` operator converts a string to uppercase and `$toLower` converts it to lowercase. These are useful for normalization and display formatting.

```javascript
db.customers.aggregate([
  {
    $project: {
      normalizedEmail: { $toLower: "$email" },
      displayName: { $toUpper: "$username" }
    }
  }
])
```

A common use case is case-insensitive grouping:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: { $toLower: "$status" },
      count: { $sum: 1 },
      total: { $sum: "$amount" }
    }
  }
])
```

## Combining String Operators

These operators can be combined to produce complex string transformations. The following creates a formatted display label from multiple fields:

```javascript
db.employees.aggregate([
  {
    $project: {
      badge: {
        $concat: [
          { $toUpper: { $substrCP: ["$firstName", 0, 1] } },
          { $toLower: { $substr: ["$firstName", 1, -1] } },
          " ",
          { $toUpper: "$lastName" }
        ]
      },
      department: { $toUpper: "$dept" }
    }
  }
])
```

## Searching and Replacing with $replaceOne and $replaceAll

For find-and-replace operations on strings, MongoDB provides `$replaceOne` and `$replaceAll`:

```javascript
db.articles.aggregate([
  {
    $project: {
      cleanedBody: {
        $replaceAll: {
          input: "$body",
          find: "\n",
          replacement: " "
        }
      }
    }
  }
])
```

## Summary

MongoDB string aggregation operators like `$concat`, `$substrCP`, `$toUpper`, and `$toLower` give you powerful text transformation capabilities directly in the database layer. By combining these operators, you can normalize data, build computed labels, and format strings without additional application-side processing. Use `$ifNull` and `$cond` alongside string operators to safely handle null or missing field values.
