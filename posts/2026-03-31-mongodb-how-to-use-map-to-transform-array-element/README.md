# How to Use $map to Transform Array Elements in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Array Operator, $map, Database

Description: Learn how to use $map in MongoDB aggregation to apply a transformation expression to each element in an array, producing a new transformed array.

---

## Overview

The `$map` aggregation operator applies a transformation expression to each element of an array, returning a new array of the same length with the results. It is the MongoDB aggregation equivalent of the `map` function found in most programming languages - perfect for reshaping, renaming, or computing new values for every element in an embedded array.

## Basic Syntax

`$map` requires `input` (the source array) and `in` (the expression applied to each element). The `as` parameter (the variable name for each element) is optional and defaults to `"this"`.

```javascript
db.orders.aggregate([
  {
    $project: {
      itemPrices: {
        $map: {
          input: "$items",
          as: "item",
          in: "$$item.price"
        }
      }
    }
  }
])
```

This extracts just the `price` field from each element in the `items` array.

## Applying Math Transformations

Apply discounts or price adjustments to all items at once:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      discountedPrices: {
        $map: {
          input: "$variants",
          as: "v",
          in: {
            sku: "$$v.sku",
            originalPrice: "$$v.price",
            salePrice: { $multiply: ["$$v.price", 0.8] }
          }
        }
      }
    }
  }
])
```

## Reshaping Array Objects

Transform array objects to include only specific fields or add computed fields:

```javascript
db.employees.aggregate([
  {
    $project: {
      teamSummary: {
        $map: {
          input: "$team",
          as: "member",
          in: {
            name: { $concat: ["$$member.firstName", " ", "$$member.lastName"] },
            role: { $toUpper: "$$member.role" },
            seniorityYears: {
              $floor: {
                $divide: [
                  { $subtract: ["$$NOW", "$$member.joinDate"] },
                  31536000000
                ]
              }
            }
          }
        }
      }
    }
  }
])
```

## Converting Array Element Types

Convert an array of strings to numbers or dates:

```javascript
db.imports.aggregate([
  {
    $project: {
      numericValues: {
        $map: {
          input: "$stringValues",
          as: "s",
          in: { $toDouble: "$$s" }
        }
      }
    }
  }
])
```

## Combining $map with $filter

First filter the array, then transform the remaining elements:

```javascript
db.invoices.aggregate([
  {
    $project: {
      taxableTotals: {
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
            subtotal: "$$taxable.price",
            tax: { $multiply: ["$$taxable.price", 0.1] },
            total: { $multiply: ["$$taxable.price", 1.1] }
          }
        }
      }
    }
  }
])
```

## Using $map with $sum for Array Aggregation

Calculate the sum of a transformed array with `$reduce` or `$sum`:

```javascript
db.carts.aggregate([
  {
    $project: {
      userId: 1,
      lineTotal: {
        $sum: {
          $map: {
            input: "$items",
            as: "item",
            in: { $multiply: ["$$item.price", "$$item.quantity"] }
          }
        }
      }
    }
  }
])
```

## Flattening with $map and $concatArrays

Map each element to a sub-array and then flatten:

```javascript
db.courses.aggregate([
  {
    $project: {
      allLessons: {
        $reduce: {
          input: {
            $map: {
              input: "$modules",
              as: "m",
              in: "$$m.lessons"
            }
          },
          initialValue: [],
          in: { $concatArrays: ["$$value", "$$this"] }
        }
      }
    }
  }
])
```

## Summary

The `$map` operator is fundamental for array transformation in MongoDB aggregation. It applies any expression uniformly to every element of an array, enabling reshaping, type conversion, and computed fields. Combining `$map` with `$filter`, `$reduce`, and `$sum` unlocks powerful array processing pipelines that would otherwise require multiple round trips or application-side logic.
