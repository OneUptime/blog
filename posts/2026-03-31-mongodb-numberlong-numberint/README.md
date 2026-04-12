# How to Use NumberLong and NumberInt in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, NumberLong, NumberInt, BSON

Description: Understand when and how to use MongoDB's NumberLong and NumberInt BSON integer types to avoid precision loss and correctly handle integer arithmetic in queries.

---

## BSON Integer Types

MongoDB's BSON format distinguishes between three numeric integer types:

- `NumberInt` (32-bit signed integer, BSON type 16) - values from -2,147,483,648 to 2,147,483,647
- `NumberLong` (64-bit signed integer, BSON type 18) - values up to 9,223,372,036,854,775,807
- `Double` (64-bit floating point, BSON type 1) - the default for JavaScript numbers

In the legacy `mongo` shell, plain integer literals are stored as `Double` by default. In `mongosh`, integer literals are stored as `Int32` if they fit in 32 bits, or `Long` if they exceed 32-bit range but remain within the safe integer range. Explicit wrappers are still recommended for clarity and portability.

## When to Use NumberInt and NumberLong

Use `NumberInt` for small counters, ages, and quantities where a 32-bit range is sufficient. Use `NumberLong` for large identifiers, epoch timestamps in milliseconds, file sizes, and any value that might exceed 2 billion.

## Inserting NumberInt and NumberLong

```javascript
db.products.insertOne({
  productId: NumberLong("9876543210"),
  quantity:  NumberInt(50),
  pageViews: NumberLong(1234567890123)
});
```

Verify the stored types:

```javascript
const doc = db.products.findOne({ quantity: NumberInt(50) });
print(doc.productId);   // NumberLong(9876543210)
print(doc.quantity);    // 50
```

## Querying with Integer Types

MongoDB compares numeric values across types, but it is good practice to match the stored type in queries:

```javascript
// Both work, but matching type is safer
db.products.find({ quantity: NumberInt(50) });
db.products.find({ quantity: 50 });
```

For range queries on `NumberLong` fields:

```javascript
db.events.find({
  eventId: { $gte: NumberLong("1000000000"), $lt: NumberLong("2000000000") }
});
```

## Arithmetic in Aggregation

Aggregation operators preserve integer types when possible:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$category",
      totalUnits: { $sum: "$quantity" }   // sums NumberInt fields
    }
  }
]);
```

## $inc Preserves Type

The `$inc` operator preserves the field's existing BSON type:

```javascript
// If pageViews is NumberLong, it stays NumberLong after increment
db.articles.updateOne(
  { _id: "article-001" },
  { $inc: { pageViews: NumberLong(1) } }
);
```

## Checking Integer Types

```javascript
// Find documents where a field is stored as 32-bit integer
db.products.find({ quantity: { $type: "int" } });

// Find documents where a field is stored as 64-bit integer
db.products.find({ productId: { $type: "long" } });
```

## In Node.js

```javascript
const { Long, Int32 } = require("bson");

await collection.insertOne({
  userId:   Long.fromNumber(9876543210),
  score:    new Int32(1500),
  balance:  Long.fromString("1234567890000")
});
```

## Summary

Use `NumberInt` for small integers that fit in 32 bits and `NumberLong` for large values like epoch milliseconds or big identifiers. Avoid relying on JavaScript's `Number` for integers outside the safe integer range (2^53 - 1), as precision loss can corrupt data silently. Always specify the correct type during insert and use `$type` filters to audit collections.
