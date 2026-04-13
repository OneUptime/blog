# How to Use Aggregation Pipeline Updates in MongoDB 4.2+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Update, Pipeline, Expression

Description: Learn how MongoDB 4.2+ allows aggregation pipeline expressions in update operations, enabling computed field updates that reference other fields in the same document.

---

## Overview

Before MongoDB 4.2, update operators like `$set` could only set static values - you could not reference other fields in the same document during an update. MongoDB 4.2 introduced aggregation pipeline syntax in `updateOne`, `updateMany`, `findOneAndUpdate`, and `bulkWrite`, allowing dynamic, computed updates.

## Syntax

Pass an array (not an object) as the update argument to use pipeline syntax:

```javascript
// Classic update (static values only)
db.users.updateOne({ _id: id }, { $set: { name: 'Alice' } });

// Pipeline update (can reference document fields)
db.users.updateOne({ _id: id }, [
  { $set: { name: 'Alice' } }
]);
```

## Computing a Field from Other Fields

The most common use case is computing a new field value from existing fields:

```javascript
// Set fullName by concatenating firstName and lastName
db.users.updateMany({}, [
  {
    $set: {
      fullName: { $concat: ['$firstName', ' ', '$lastName'] },
    },
  },
]);
```

Without pipeline updates this was impossible in a single operation.

## Incrementing with a Computed Expression

```javascript
// Apply a 10% discount to all products with price > 100
db.products.updateMany(
  { price: { $gt: 100 } },
  [
    {
      $set: {
        price: { $multiply: ['$price', 0.9] },
        discountApplied: true,
      },
    },
  ]
);
```

## Conditionally Setting a Field with $switch

```javascript
// Set tier based on points value - computed from existing data
db.users.updateMany({}, [
  {
    $set: {
      tier: {
        $switch: {
          branches: [
            { case: { $gte: ['$points', 1000] }, then: 'gold' },
            { case: { $gte: ['$points', 500] },  then: 'silver' },
          ],
          default: 'bronze',
        },
      },
    },
  },
]);
```

## Removing Sensitive Fields During Migration

```javascript
// Remove a field and add a computed replacement in one step
db.users.updateMany(
  { legacyScore: { $exists: true } },
  [
    {
      $set: {
        normalizedScore: {
          $divide: ['$legacyScore', 100],
        },
      },
    },
    {
      $unset: 'legacyScore',
    },
  ]
);
```

Multiple pipeline stages can be chained in the array.

## Updating with Date Calculations

```javascript
// Set expiresAt to 30 days after createdAt if not already set (requires MongoDB 5.0+)
db.subscriptions.updateMany(
  { expiresAt: { $exists: false } },
  [
    {
      $set: {
        expiresAt: {
          $dateAdd: {
            startDate: '$createdAt',
            unit: 'day',
            amount: 30,
          },
        },
      },
    },
  ]
);
```

## Using Pipeline Updates in findOneAndUpdate

```javascript
const result = await db.collection('counters').findOneAndUpdate(
  { _id: 'pageViews' },
  [
    {
      $set: {
        count: { $add: ['$count', 1] },
        lastUpdated: '$$NOW',
      },
    },
  ],
  { returnDocument: 'after', upsert: true }
);
```

`$$NOW` is a system variable available in pipeline updates that evaluates to the current date and time.

## Supported Pipeline Stages in Update

Only the following stages are supported in update pipelines:

- `$set` / `$addFields` - Add or update fields
- `$unset` / `$project` (to remove fields) - Remove fields
- `$replaceWith` / `$replaceRoot` - Replace the root document

Complex stages like `$lookup`, `$group`, and `$match` are not available.

## Summary

Aggregation pipeline updates in MongoDB 4.2+ unlock computed field updates, conditional logic with `$cond` and `$switch`, and multi-stage document transformations in a single atomic write. Pass an array instead of an object as the update argument to opt into pipeline mode. This feature eliminates many cases where you previously had to read a document, compute new values in application code, and write back - reducing both code complexity and database round-trips.
