# How to Define and Use Variables in MongoDB Aggregation with $let

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Operator

Description: Learn how to define and reuse local variables in MongoDB aggregation expressions using $let to simplify complex pipelines.

---

Complex aggregation expressions often compute the same sub-expression multiple times, making pipelines verbose and hard to maintain. `$let` allows you to assign computed values to named variables within an expression scope, so you compute once and reference many times.

## $let Syntax

```javascript
{
  $let: {
    vars: {
      <varName>: <expression>,
      ...
    },
    in: <expression using $$varName>
  }
}
```

Variables defined in `vars` are accessible within `in` using the `$$varName` prefix. They are scoped to the `$let` expression and do not leak into the surrounding pipeline.

## Avoiding Repeated Computation

Without `$let`, you might compute the same sub-expression multiple times:

```javascript
// Without $let - computes discountedPrice twice
db.orders.aggregate([
  {
    $project: {
      discountedPrice: { $multiply: ["$price", 0.8] },
      savings: { $subtract: ["$price", { $multiply: ["$price", 0.8] }] }
    }
  }
]);
```

With `$let`, compute once and reference twice:

```javascript
db.orders.aggregate([
  {
    $project: {
      result: {
        $let: {
          vars: {
            discounted: { $multiply: ["$price", 0.8] }
          },
          in: {
            discountedPrice: "$$discounted",
            savings: { $subtract: ["$price", "$$discounted"] }
          }
        }
      }
    }
  }
]);
```

## Multiple Variables in $let

Define several variables and use them together in the `in` expression:

```javascript
db.sales.aggregate([
  {
    $project: {
      summary: {
        $let: {
          vars: {
            subtotal: { $multiply: ["$qty", "$unitPrice"] },
            taxRate:  0.08
          },
          in: {
            subtotal: "$$subtotal",
            tax:      { $multiply: ["$$subtotal", "$$taxRate"] },
            total:    { $multiply: ["$$subtotal", { $add: [1, "$$taxRate"] }] }
          }
        }
      }
    }
  }
]);
```

Note: variables in `vars` are evaluated independently - `taxRate` cannot reference `subtotal` within `vars`. Use the computed result in `in`.

## $let Inside $map for Readability

`$let` inside `$map` clarifies complex per-element logic:

```javascript
db.orders.aggregate([
  {
    $project: {
      itemSummaries: {
        $map: {
          input: "$lineItems",
          as: "item",
          in: {
            $let: {
              vars: {
                lineTotal: { $multiply: ["$$item.qty", "$$item.price"] },
                discount:  { $cond: [{ $gt: ["$$item.qty", 10] }, 0.1, 0] }
              },
              in: {
                productId:     "$$item.productId",
                lineTotal:     "$$lineTotal",
                discountAmt:   { $multiply: ["$$lineTotal", "$$discount"] },
                finalTotal:    { $multiply: ["$$lineTotal", { $subtract: [1, "$$discount"] }] }
              }
            }
          }
        }
      }
    }
  }
]);
```

## Using $let in $lookup's Pipeline

`$let` in the `$lookup` pipeline passes parent document fields into the sub-pipeline:

```javascript
db.orders.aggregate([
  {
    $lookup: {
      from: "inventory",
      let: { orderRegion: "$region", orderDate: "$placedAt" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$region", "$$orderRegion"] },
                { $lte: ["$availableFrom", "$$orderDate"] }
              ]
            }
          }
        }
      ],
      as: "availableInventory"
    }
  }
]);
```

Here, `let` at the `$lookup` level defines variables from the parent document that are referenced in the sub-pipeline with `$$`.

## Summary

Use `$let` to name computed sub-expressions and avoid repeating complex calculations. It improves readability, reduces redundant computation, and allows you to compose complex expressions from named building blocks. In `$lookup`, the `let` field passes parent document values into the sub-pipeline as variables. Variable names use the `$$` prefix when referenced in the `in` expression.
