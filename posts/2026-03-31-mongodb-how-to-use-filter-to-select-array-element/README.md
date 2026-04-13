# How to Use $filter to Select Array Elements by Condition in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Array Operator, $filter, Database

Description: Learn how to use $filter in MongoDB aggregation to select only those array elements that match a given condition, returning a new filtered array.

---

## Overview

The `$filter` aggregation operator lets you select elements from an array based on a condition, returning a new array containing only the matching elements. This is useful for extracting subsets of embedded arrays - like active items, items above a threshold, or items matching a tag - without restructuring your documents.

## Basic Syntax

`$filter` requires two fields: `input` (the array) and `cond` (the boolean expression). The `as` field (the variable name for each element) is optional and defaults to `this`.

```javascript
db.orders.aggregate([
  {
    $project: {
      expensiveItems: {
        $filter: {
          input: "$items",
          as: "item",
          cond: { $gt: ["$$item.price", 100] }
        }
      }
    }
  }
])
```

The `$$item` syntax (double dollar sign) references the loop variable defined in `as`.

## Filtering by String Condition

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      activeVariants: {
        $filter: {
          input: "$variants",
          as: "v",
          cond: { $eq: ["$$v.status", "active"] }
        }
      }
    }
  }
])
```

## Filtering with Multiple Conditions

Combine conditions with `$and` or `$or`:

```javascript
db.users.aggregate([
  {
    $project: {
      username: 1,
      recentCompletedOrders: {
        $filter: {
          input: "$orders",
          as: "order",
          cond: {
            $and: [
              { $eq: ["$$order.status", "completed"] },
              { $gte: ["$$order.date", new Date("2025-01-01")] }
            ]
          }
        }
      }
    }
  }
])
```

## Using $filter to Count Matching Elements

Combine `$filter` with `$size` to count matching elements:

```javascript
db.surveys.aggregate([
  {
    $project: {
      surveyId: 1,
      positiveResponseCount: {
        $size: {
          $filter: {
            input: "$responses",
            as: "r",
            cond: { $gte: ["$$r.score", 7] }
          }
        }
      }
    }
  }
])
```

## Filtering Nested Array Fields

`$filter` works with nested field paths within array elements:

```javascript
db.posts.aggregate([
  {
    $project: {
      title: 1,
      approvedComments: {
        $filter: {
          input: "$comments",
          as: "comment",
          cond: { $eq: ["$$comment.moderation.status", "approved"] }
        }
      }
    }
  }
])
```

## Using the limit Parameter

MongoDB 5.2+ added a `limit` parameter to return only the first N matching elements:

```javascript
db.inventory.aggregate([
  {
    $project: {
      top3InStock: {
        $filter: {
          input: "$items",
          as: "item",
          cond: { $gt: ["$$item.quantity", 0] },
          limit: 3
        }
      }
    }
  }
])
```

## Combining $filter with $map

Use `$filter` before `$map` to process only the relevant elements:

```javascript
db.invoices.aggregate([
  {
    $project: {
      taxableLineItems: {
        $map: {
          input: {
            $filter: {
              input: "$lineItems",
              as: "li",
              cond: { $eq: ["$$li.taxable", true] }
            }
          },
          as: "taxable",
          in: {
            description: "$$taxable.description",
            tax: { $multiply: ["$$taxable.price", 0.1] }
          }
        }
      }
    }
  }
])
```

## Summary

The `$filter` operator is a powerful tool for working with embedded arrays in MongoDB aggregation. It creates a new array from elements that satisfy a condition, integrating naturally with `$size`, `$map`, and `$project` for comprehensive array processing. The `limit` parameter (available from MongoDB 5.2) adds efficiency when only the first few matches are needed. Always use `$$variableName` syntax to reference the loop variable inside the `cond` expression.
