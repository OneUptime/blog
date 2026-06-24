# How to Update a Field Based on Another Field's Value in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Update, Aggregation, Pipeline

Description: Learn how to update a MongoDB field using the value of another field in the same document, using update pipeline expressions and $set with $expr.

---

## The Challenge: Self-Referencing Updates

Traditional MongoDB update operators like `$set` accept literal values - you cannot directly reference another field in the same document. MongoDB 4.2 introduced update pipelines that solve this by letting you use aggregation expressions in update statements.

## Using an Update Pipeline with $set

The update pipeline syntax passes an array (rather than a plain object) as the update argument. Inside the array, you use aggregation expressions:

```javascript
// Copy the "price" field value into a new "originalPrice" field
db.products.updateMany(
  {},
  [
    { $set: { originalPrice: "$price" } }
  ]
)
```

The `"$price"` syntax references the current document's `price` field - the same way it works in a `$project` stage.

## Arithmetic Operations on Field Values

Compute a discounted price from the existing price:

```javascript
db.products.updateMany(
  { category: "sale" },
  [
    {
      $set: {
        discountedPrice: { $multiply: ["$price", 0.8] }
      }
    }
  ]
)
```

Add a surcharge to shipping cost based on weight:

```javascript
db.orders.updateMany(
  {},
  [
    {
      $set: {
        totalCost: { $add: ["$basePrice", { $multiply: ["$weightKg", 2.5] }] }
      }
    }
  ]
)
```

## Concatenating String Fields

Build a `fullName` field from `firstName` and `lastName`:

```javascript
db.users.updateMany(
  {},
  [
    {
      $set: {
        fullName: {
          $concat: ["$firstName", " ", "$lastName"]
        }
      }
    }
  ]
)
```

## Conditional Updates Using $cond

Set a `status` field to `"premium"` or `"standard"` based on whether the `totalSpend` exceeds a threshold:

```javascript
db.customers.updateMany(
  {},
  [
    {
      $set: {
        tier: {
          $cond: {
            if: { $gte: ["$totalSpend", 1000] },
            then: "premium",
            else: "standard"
          }
        }
      }
    }
  ]
)
```

## Updating to a Computed Date

Set `expiresAt` to 30 days after `createdAt`:

```javascript
db.subscriptions.updateMany(
  { expiresAt: { $exists: false } },
  [
    {
      $set: {
        expiresAt: {
          $dateAdd: {
            startDate: "$createdAt",
            unit: "day",
            amount: 30
          }
        }
      }
    }
  ]
)
```

## Python Example

```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["shop"]

# Set salePrice = price * 0.9 for all products
result = db.products.update_many(
    {},
    [
        {"$set": {"salePrice": {"$multiply": ["$price", 0.9]}}}
    ]
)

print(f"Updated {result.modified_count} documents")
```

## Node.js Example

```javascript
const result = await db.collection("products").updateMany(
  {},
  [
    { $set: { salePrice: { $multiply: ["$price", 0.9] } } }
  ]
);

console.log(`Updated ${result.modifiedCount} documents`);
```

## Summary

Use update pipelines (an array as the second argument) to reference document fields during an update. Aggregation expressions like `$multiply`, `$add`, `$concat`, and `$cond` all work inside update pipeline stages. This feature requires MongoDB 4.2 or later. The `$dateAdd` operator requires MongoDB 5.0 or later. For complex multi-step transformations, chain multiple `$set` stages in the same array.
