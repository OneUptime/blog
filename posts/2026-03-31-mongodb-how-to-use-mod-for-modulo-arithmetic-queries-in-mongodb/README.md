# How to Use $mod for Modulo Arithmetic Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query Operator, Modulo, Arithmetic, Database

Description: Learn how to use MongoDB's $mod operator to filter documents based on modulo arithmetic, enabling efficient queries on numeric field remainders.

---

## What Is the $mod Operator?

The `$mod` operator in MongoDB performs a modulo operation on a field's value and returns documents where the remainder matches the specified value. This is useful for filtering numeric data by divisibility patterns without requiring extra fields or application-side filtering.

The syntax is:

```javascript
{ field: { $mod: [divisor, remainder] } }
```

Both `divisor` and `remainder` should be numbers. If non-integer values are provided, MongoDB truncates them to integers before performing the operation. MongoDB will return documents where `field % divisor === remainder`.

## Basic Usage

Suppose you have an `orders` collection and want to find orders whose `orderNumber` is even (divisible by 2):

```javascript
db.orders.find({ orderNumber: { $mod: [2, 0] } })
```

To find orders where `orderNumber % 3 === 1`:

```javascript
db.orders.find({ orderNumber: { $mod: [3, 1] } })
```

## Practical Example - Batch Processing

A common use case is dividing documents into processing batches. If you want to process every third document in a batch job, you can select based on document ID:

```javascript
// Select batch 0 of 3
db.tasks.find({ batchId: { $mod: [3, 0] } })

// Select batch 1 of 3
db.tasks.find({ batchId: { $mod: [3, 1] } })

// Select batch 2 of 3
db.tasks.find({ batchId: { $mod: [3, 2] } })
```

This approach evenly distributes processing load without maintaining extra metadata.

## Using $mod in Aggregation

You can also use the `$mod` expression operator within aggregation pipelines:

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      priceRemainder: { $mod: ["$price", 10] }
    }
  },
  {
    $match: { priceRemainder: 0 }
  }
])
```

This finds products whose price is divisible by 10.

## Handling Negative Numbers

MongoDB's `$mod` follows the sign of the dividend (the field value), not the divisor. Be cautious when working with negative values:

```javascript
// -7 % 3 = -1 in MongoDB
db.accounts.find({ balance: { $mod: [3, -1] } })
```

## Indexing Considerations

The `$mod` operator does not benefit from standard indexes on the queried field in the same way range queries do. For large collections, consider adding an application-level computed field (e.g., `mod3Value`) and indexing that field instead:

```javascript
db.tasks.createIndex({ mod3Value: 1 })
```

Then at insert or update time:

```javascript
db.tasks.updateOne(
  { _id: taskId },
  { $set: { mod3Value: taskId % 3 } }
)
```

## Error Cases

If you pass an array with fewer than two elements, MongoDB returns an error:

```text
Error: $mod requires an array with two elements [divisor, remainder]
```

Note that non-integer values do not cause an error — MongoDB truncates them to integers. For example, `{ $mod: [2.5, 0] }` is treated as `{ $mod: [2, 0] }`. Always validate your inputs before running modulo queries in production code.

## Summary

The `$mod` operator lets you filter documents based on numeric remainder calculations, making it ideal for batch processing, round-robin selection, and divisibility checks. While simple to use, be aware of performance implications on large collections and consider indexed computed fields for high-throughput workloads.
