# How to Use $let to Define Variables in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $let, Variable, Pipeline Optimization

Description: Learn how to use $let to define reusable variables in MongoDB aggregation expressions to simplify complex calculations and avoid repetition.

---

## Overview

The `$let` operator in MongoDB aggregation allows you to bind variables to expressions and use those variables within a defined scope. This prevents repeating complex sub-expressions and makes pipelines easier to read and maintain.

## Basic $let Syntax

`$let` takes two arguments: `vars` (a document defining variable bindings) and `in` (the expression that uses those variables).

```javascript
// Syntax
{
  $let: {
    vars: { <var1>: <expression1>, <var2>: <expression2> },
    in: <expression using $$var1, $$var2>
  }
}
```

Variables defined in `$let` are accessed with the `$$` prefix:

```javascript
db.orders.aggregate([
  {
    $project: {
      finalPrice: {
        $let: {
          vars: {
            basePrice: { $multiply: ["$quantity", "$unitPrice"] },
            taxRate: 0.08
          },
          in: {
            $add: [
              "$$basePrice",
              { $multiply: ["$$basePrice", "$$taxRate"] }
            ]
          }
        }
      }
    }
  }
])
```

## Avoiding Expression Repetition

Without `$let`, complex sub-expressions often need to be repeated:

```javascript
// Without $let - discountedPrice repeated twice
db.products.aggregate([
  {
    $project: {
      savings: {
        $subtract: [
          "$originalPrice",
          { $multiply: ["$originalPrice", { $subtract: [1, "$discountRate"] }] }
        ]
      },
      finalPrice: {
        $multiply: ["$originalPrice", { $subtract: [1, "$discountRate"] }]
      }
    }
  }
])

// With $let - clean and DRY
db.products.aggregate([
  {
    $project: {
      pricing: {
        $let: {
          vars: {
            discountedPrice: {
              $multiply: ["$originalPrice", { $subtract: [1, "$discountRate"] }]
            }
          },
          in: {
            finalPrice: "$$discountedPrice",
            savings: { $subtract: ["$originalPrice", "$$discountedPrice"] }
          }
        }
      }
    }
  }
])
```

## Practical Example - Calculating Shipping Cost

```javascript
db.shipments.insertMany([
  { orderId: 1, weight: 2.5, distance: 100, isPriority: true },
  { orderId: 2, weight: 5.0, distance: 250, isPriority: false }
])

db.shipments.aggregate([
  {
    $project: {
      orderId: 1,
      shippingCost: {
        $let: {
          vars: {
            baseRate: { $multiply: ["$weight", 0.5] },
            distanceFee: { $multiply: ["$distance", 0.01] },
            prioritySurcharge: { $cond: ["$isPriority", 10, 0] }
          },
          in: {
            $add: ["$$baseRate", "$$distanceFee", "$$prioritySurcharge"]
          }
        }
      }
    }
  }
])
```

## Nested $let Expressions

`$let` expressions can reference variables from an outer `$let`:

```javascript
db.invoices.aggregate([
  {
    $project: {
      invoiceId: 1,
      summary: {
        $let: {
          vars: {
            subtotal: { $sum: "$lineItems.amount" }
          },
          in: {
            $let: {
              vars: {
                tax: { $multiply: ["$$subtotal", 0.1] }
              },
              in: {
                subtotal: "$$subtotal",
                tax: "$$tax",
                total: { $add: ["$$subtotal", "$$tax"] }
              }
            }
          }
        }
      }
    }
  }
])
```

## Using $let in $addFields

```javascript
db.employees.aggregate([
  {
    $addFields: {
      compensation: {
        $let: {
          vars: {
            annualSalary: { $multiply: ["$monthlySalary", 12] },
            bonus: { $multiply: ["$monthlySalary", "$bonusMultiplier"] }
          },
          in: {
            annual: "$$annualSalary",
            bonus: "$$bonus",
            total: { $add: ["$$annualSalary", "$$bonus"] }
          }
        }
      }
    }
  }
])
```

## $let Inside $map

`$let` pairs naturally with `$map` for per-element calculations:

```javascript
db.carts.aggregate([
  {
    $project: {
      items: {
        $map: {
          input: "$lineItems",
          as: "item",
          in: {
            $let: {
              vars: {
                lineTotal: { $multiply: ["$$item.qty", "$$item.price"] }
              },
              in: {
                name: "$$item.name",
                qty: "$$item.qty",
                price: "$$item.price",
                lineTotal: "$$lineTotal",
                discounted: { $multiply: ["$$lineTotal", 0.9] }
              }
            }
          }
        }
      }
    }
  }
])
```

## Summary

`$let` binds named variables to expressions within a specific scope, allowing complex sub-expressions to be computed once and referenced multiple times. It improves pipeline readability by naming intermediate values, reduces errors from expression duplication, and enables cleaner nested logic. Using `$let` is a best practice whenever a computed value is referenced more than once in a pipeline stage.
