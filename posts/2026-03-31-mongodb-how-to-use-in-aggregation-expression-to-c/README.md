# How to Use $in (Aggregation Expression) to Check Array Membership in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Array Operator, $in Expression, Database

Description: Learn how to use the $in aggregation expression in MongoDB to check whether a value exists within an array, returning a boolean result for use in conditions.

---

## Overview

MongoDB has two distinct uses of `$in`: the query operator for filtering documents, and the aggregation expression operator for checking membership within an array. The aggregation `$in` operator returns a boolean `true` or `false` indicating whether a value is present in the given array. This is extremely useful inside `$project`, `$addFields`, and conditional expressions.

## Basic Syntax

The aggregation `$in` expression takes two arguments: the value to search for and the array to search in.

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      category: 1,
      isFeatured: {
        $in: ["$category", ["electronics", "gaming", "computers"]]
      }
    }
  }
])
```

Note: The first argument is the value, the second is the array - the order matters.

## Checking Membership Against a Document Field Array

Check whether a specific value is in an array field of the document:

```javascript
db.users.aggregate([
  {
    $project: {
      username: 1,
      isAdmin: {
        $in: ["admin", "$roles"]
      },
      isModerator: {
        $in: ["moderator", "$roles"]
      }
    }
  }
])
```

## Using $in in Conditional Expressions

Combine `$in` with `$cond` to compute a result based on membership:

```javascript
db.orders.aggregate([
  {
    $project: {
      orderId: 1,
      status: 1,
      shippingLabel: {
        $cond: {
          if: { $in: ["$status", ["shipped", "in_transit", "delivered"]] },
          then: "In Transit",
          else: "Pending"
        }
      }
    }
  }
])
```

## Filtering with $in in $match via $expr

Use `$in` inside `$expr` to leverage aggregation expressions in `$match`:

```javascript
db.articles.aggregate([
  {
    $match: {
      $expr: {
        $in: ["mongodb", "$tags"]
      }
    }
  }
])
```

This differs from the query `$in` operator - the aggregation form checks if a scalar value is in an array field.

## Combining $in with $filter

Use `$in` inside a `$filter` condition to keep elements that match a list:

```javascript
db.inventory.aggregate([
  {
    $project: {
      allowedItems: {
        $filter: {
          input: "$items",
          as: "item",
          cond: {
            $in: ["$$item.category", ["tools", "hardware", "parts"]]
          }
        }
      }
    }
  }
])
```

## Negating $in with $not

To check that a value is NOT in an array, wrap `$in` in `$not`:

```javascript
db.users.aggregate([
  {
    $project: {
      username: 1,
      isRegularUser: {
        $not: [{ $in: ["$role", ["admin", "superuser", "moderator"]] }]
      }
    }
  }
])
```

## Practical Example: Tagging Documents

Add a computed tag to documents based on category membership:

```javascript
db.products.aggregate([
  {
    $addFields: {
      isOnSale: {
        $in: ["$sku", "$$ROOT.activeSaleSkus"]
      },
      tier: {
        $switch: {
          branches: [
            {
              case: { $in: ["$category", ["luxury", "premium"]] },
              then: "premium"
            },
            {
              case: { $in: ["$category", ["budget", "economy"]] },
              then: "economy"
            }
          ],
          default: "standard"
        }
      }
    }
  }
])
```

## Summary

The aggregation `$in` expression in MongoDB provides a clean way to check array membership within pipeline stages. Unlike the query `$in` operator which filters documents, the aggregation form returns a boolean value for use in projections, conditionals, and filters. It is a frequently used building block for computing labels, access levels, and filtering logic directly in the pipeline.
