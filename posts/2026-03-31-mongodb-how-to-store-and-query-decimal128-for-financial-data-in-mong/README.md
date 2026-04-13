# How to Store and Query Decimal128 for Financial Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Decimal128, Financial Data, Precision Arithmetic, Data Type

Description: Learn how to use MongoDB's Decimal128 type to store and query financial data with precise decimal arithmetic, avoiding floating-point rounding errors.

---

## Why Decimal128 for Financial Data

Floating-point numbers (`double`) cannot represent many decimal fractions exactly. For financial applications, a price of `19.99` stored as a double may be internally represented as `19.989999999999...`, causing rounding errors when summing thousands of transactions.

MongoDB's `Decimal128` type uses the IEEE 754-2008 128-bit decimal floating-point standard, providing 34 significant decimal digits of precision. This makes it the correct choice for currency, accounting, and any domain where decimal exactness matters.

## Inserting Decimal128 Documents

Use `NumberDecimal()` in the mongo shell or the driver's `Decimal128` class:

```javascript
// mongo shell
db.transactions.insertOne({
  accountId: "ACC-001",
  amount: NumberDecimal("199.99"),
  currency: "USD",
  type: "debit",
  timestamp: new Date()
});
```

In Node.js with the official driver:

```javascript
const { Decimal128 } = require("mongodb");

await db.collection("transactions").insertOne({
  accountId: "ACC-001",
  amount: Decimal128.fromString("199.99"),
  currency: "USD",
  type: "debit",
  timestamp: new Date()
});
```

In Python with PyMongo:

```python
from bson.decimal128 import Decimal128

db.transactions.insert_one({
    "accountId": "ACC-001",
    "amount": Decimal128("199.99"),
    "currency": "USD",
    "type": "debit"
})
```

## Querying Decimal128 Fields

Comparison operators work as expected with Decimal128:

```javascript
// Find transactions over $100
db.transactions.find({
  amount: { $gt: NumberDecimal("100.00") }
});

// Find exact amount
db.transactions.find({
  amount: NumberDecimal("199.99")
});
```

Range query for reporting:

```javascript
db.transactions.find({
  amount: {
    $gte: NumberDecimal("50.00"),
    $lte: NumberDecimal("500.00")
  },
  timestamp: {
    $gte: new Date("2024-01-01"),
    $lt: new Date("2025-01-01")
  }
});
```

## Aggregating Decimal128 Values

The aggregation pipeline handles Decimal128 arithmetic correctly:

```javascript
db.transactions.aggregate([
  { $match: { type: "debit", currency: "USD" } },
  {
    $group: {
      _id: "$accountId",
      totalDebits: { $sum: "$amount" },
      count: { $sum: 1 },
      avgDebit: { $avg: "$amount" }
    }
  },
  { $sort: { totalDebits: -1 } }
]);
```

Collecting all transactions per account:

```javascript
db.transactions.aggregate([
  { $sort: { accountId: 1, timestamp: 1 } },
  {
    $group: {
      _id: "$accountId",
      transactions: { $push: { amount: "$amount", type: "$type", ts: "$timestamp" } }
    }
  }
]);
```

## Indexing Decimal128 Fields

Decimal128 fields can be indexed like any other field:

```javascript
db.transactions.createIndex({ amount: 1 });
db.transactions.createIndex({ accountId: 1, timestamp: -1, amount: 1 });
```

Verify the index is used with `explain()`:

```javascript
db.transactions.find({ amount: { $gt: NumberDecimal("1000.00") } })
  .explain("executionStats");
```

## Avoiding Common Pitfalls

Do not mix `double` and `Decimal128` in the same field across documents. MongoDB will store whichever type you insert, but comparisons between types may yield unexpected results.

```javascript
// BAD - inconsistent types
db.prices.insertMany([
  { price: 9.99 },          // double
  { price: NumberDecimal("9.99") }  // Decimal128
]);

// These may not match each other in equality checks
```

Use a schema validator to enforce the type:

```javascript
db.createCollection("transactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["amount", "currency"],
      properties: {
        amount: { bsonType: "decimal" },
        currency: { bsonType: "string" }
      }
    }
  }
});
```

## Converting Existing Double Fields

If you have existing data stored as doubles, convert it in a batched update:

```javascript
db.transactions.find({ amount: { $type: "double" } }).forEach(doc => {
  db.transactions.updateOne(
    { _id: doc._id },
    { $set: { amount: NumberDecimal(doc.amount.toString()) } }
  );
});
```

## Summary

MongoDB's Decimal128 type is essential for financial applications because it eliminates the rounding errors inherent in double-precision floating-point numbers. Use `NumberDecimal()` in the shell, or the `Decimal128` class in drivers, for all monetary fields, and enforce consistency with JSON Schema validators. Indexing and aggregation work seamlessly with Decimal128, making it a drop-in replacement for doubles in financial contexts.
