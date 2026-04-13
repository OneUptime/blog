# How to Use $or for Alternative Conditions in MongoDB Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $or, Logical Operator, Query, Alternatives, Node.js

Description: Learn how to use MongoDB's $or operator to match documents satisfying at least one of multiple conditions, with performance tips and aggregation examples.

---

## What Is the $or Operator?

The `$or` operator matches documents that satisfy **at least one** of the conditions in an array. It is the MongoDB equivalent of SQL's `OR` clause.

```javascript
// Find orders that are either pending OR overdue
db.orders.find({
  $or: [
    { status: 'pending' },
    { dueDate: { $lt: new Date() } },
  ]
})
```

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('shop');
const products = db.collection('products');

// Match on two different fields
const highlighted = await products.find({
  $or: [
    { status: 'featured' },
    { onSale: true },
  ]
}).toArray();

// Match different ranges on the same field
const budget = await products.find({
  $or: [
    { price: { $lt: 10 } },
    { price: { $gt: 1000 } },
  ]
}).toArray();

// Three conditions
const urgentOrders = await db.collection('orders').find({
  $or: [
    { priority: 'urgent' },
    { status: 'overdue' },
    { customerTier: 'enterprise' },
  ]
}).toArray();
```

## Combining $or with Other Conditions (Implicit AND)

```javascript
// status must be 'active' AND (price < 50 OR onSale is true)
const deals = await products.find({
  status: 'active',
  $or: [
    { price: { $lt: 50 } },
    { onSale: true },
  ]
}).toArray();
```

## $or in Aggregation Pipeline

```javascript
// $match with $or
const results = await products.aggregate([
  {
    $match: {
      $or: [
        { category: 'electronics' },
        { category: 'gadgets' },
        { price: { $lt: 20 } },
      ]
    }
  },
  { $group: { _id: '$category', count: { $sum: 1 } } },
]).toArray();
```

As a boolean expression:

```javascript
const withFlags = await products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      isHighlighted: {
        $or: [
          { $eq: ['$status', 'featured'] },
          { $gte: ['$rating', 4.5] },
          { $lt: ['$price', 5] },
        ]
      },
    }
  }
]).toArray();
```

## PyMongo Usage

```python
from pymongo import MongoClient
from datetime import datetime

client = MongoClient('mongodb://localhost:27017')
db = client['shop']
products = db['products']

# Match either featured or on sale
highlighted = list(products.find({
    '$or': [
        {'status': 'featured'},
        {'onSale': True}
    ]
}))

# Combine with implicit AND
active_deals = list(products.find({
    'status': 'active',
    '$or': [
        {'price': {'$lt': 20}},
        {'discount': {'$gte': 30}},
    ]
}))
```

## $or vs. $in for Same-Field Conditions

When all `$or` conditions test the same field for equality, `$in` is simpler and more performant:

```javascript
// Prefer $in for same-field equality alternatives:
await products.find({ category: { $in: ['electronics', 'gadgets', 'toys'] } })

// Over $or with same field:
await products.find({
  $or: [
    { category: 'electronics' },
    { category: 'gadgets' },
    { category: 'toys' },
  ]
})
```

Use `$or` when conditions span different fields or use different operators.

## Index Usage with $or

MongoDB can use an index for each clause of `$or` separately (index merge):

```javascript
// Create indexes on each field used in $or
await products.createIndex({ status: 1 });
await products.createIndex({ price: 1 });

// MongoDB may use both indexes and merge results
const plan = await products
  .find({ $or: [{ status: 'featured' }, { price: { $lt: 20 } }] })
  .explain('executionStats');

// Look for 'OR' stage with two IXSCAN children in explain output
```

If any clause of `$or` cannot use an index, MongoDB falls back to a full collection scan for the entire query. Ensure all `$or` clauses have index coverage for best performance.

## Nested $or and $and

```javascript
// (A AND B) OR (C AND D)
const results = await products.find({
  $or: [
    { $and: [{ category: 'electronics' }, { price: { $lt: 100 } }] },
    { $and: [{ category: 'books' }, { rating: { $gte: 4 } }] },
  ]
}).toArray();
```

## Summary

The MongoDB `$or` operator matches documents satisfying at least one of multiple conditions, making it ideal for queries that span different fields. When all conditions test equality on the same field, prefer `$in` for better readability and performance. Always index the fields used in each `$or` clause to allow MongoDB to perform efficient index merges rather than full collection scans. Combine `$or` with implicit AND (other top-level fields) to narrow results further.
