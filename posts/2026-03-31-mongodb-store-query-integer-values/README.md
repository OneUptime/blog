# How to Store and Query Integer Values in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Integer, BSON, Query, Number

Description: Understand how MongoDB stores 32-bit and 64-bit integers in BSON, how to query numeric ranges, and how to avoid common type mismatch bugs.

---

## Integer Types in BSON

MongoDB supports two integer types:
- `int` (BSON type 16): 32-bit signed integer, range -2,147,483,648 to 2,147,483,647
- `long` (BSON type 18): 64-bit signed integer for larger values

The MongoDB shell and most drivers automatically choose the correct type based on the value size, but it is important to be explicit when precision matters.

## Inserting Integer Values

```javascript
// In mongosh - use NumberInt() for 32-bit, NumberLong() for 64-bit
db.products.insertOne({
  name: "Widget",
  quantity: NumberInt(150),
  sku: NumberLong(9876543210),
  price: 29.99, // This is a double, not an integer
});
```

In the Node.js driver, integers passed as JavaScript numbers are stored as BSON doubles by default. Use `Int32` or `Long` explicitly:

```javascript
const { MongoClient, Int32, Long } = require("mongodb");

await db.collection("products").insertOne({
  name: "Widget",
  quantity: new Int32(150),
  sku: new Long(9876543210n),
});
```

## Querying Integer Ranges

```javascript
// Find products with quantity between 10 and 100
db.products.find({ quantity: { $gte: 10, $lte: 100 } });

// Find products with quantity greater than 500
db.products.find({ quantity: { $gt: 500 } });

// Find products where quantity is exactly 0 (out of stock)
db.products.find({ quantity: 0 });
```

## Arithmetic in Aggregation

Use aggregation expressions for computed integer fields:

```javascript
db.orders.aggregate([
  {
    $project: {
      totalItems: { $sum: "$items.quantity" },
      discountedPrice: {
        $subtract: ["$price", { $multiply: ["$price", 0.1] }],
      },
    },
  },
]);
```

## Incrementing Integer Fields

The `$inc` operator atomically increments or decrements an integer field:

```javascript
// Decrement inventory by 5 when an order is placed
db.products.updateOne({ _id: productId }, { $inc: { quantity: -5 } });

// Increment view counter
db.articles.updateOne({ _id: articleId }, { $inc: { views: 1 } });
```

## Type Mismatch Bug

Mixing strings and numbers in a collection causes queries to miss documents because MongoDB does not coerce types during comparison:

```javascript
// This document stores price as a string "29"
db.products.insertOne({ name: "Gadget", price: "29" });

// This query returns no result because "29" != 29
db.products.find({ price: 29 });
```

Use `$type` to identify mistyped fields:

```javascript
// Find documents where price is stored as a string instead of a number
db.products.find({ price: { $type: "string" } });
```

Fix them with an update:

```javascript
db.products.find({ price: { $type: "string" } }).forEach((doc) => {
  db.products.updateOne({ _id: doc._id }, { $set: { price: NumberInt(doc.price) } });
});
```

## Index Integer Fields

Indexes on integer fields work efficiently with range queries:

```javascript
db.products.createIndex({ quantity: 1 });

// Verify the index is used
db.products.find({ quantity: { $lt: 10 } }).explain("executionStats");
```

Look for `IXSCAN` in the winning plan and confirm `totalDocsExamined` approximately equals `nReturned`.

## Schema Validation

Enforce integer types to prevent accidental string or double storage:

```javascript
db.createCollection("products", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      properties: {
        quantity: { bsonType: ["int", "long"] },
      },
      required: ["quantity"],
    },
  },
});
```

## Summary

MongoDB stores integers as 32-bit `int` or 64-bit `long` BSON types. Use `Int32` and `Long` classes in drivers to avoid accidental double storage. Range queries with `$gte`/`$lte` leverage indexes efficiently, and `$inc` provides atomic integer updates. Use `$type` queries and JSON Schema validation to detect and prevent type mismatches in your collections.
