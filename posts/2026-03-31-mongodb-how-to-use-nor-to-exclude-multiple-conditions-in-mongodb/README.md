# How to Use $nor to Exclude Multiple Conditions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $nor, Logical Operator, Exclusion, Query, Node.js

Description: Learn how to use MongoDB's $nor operator to match documents that fail all of a set of conditions, effectively excluding multiple criteria simultaneously.

---

## What Is the $nor Operator?

The `$nor` operator matches documents that fail to match **all** conditions in the provided array - essentially the opposite of `$or`. Documents must not match any of the given conditions to be returned.

```javascript
// Return documents that are neither 'cancelled' nor 'refunded'
db.orders.find({
  $nor: [
    { status: 'cancelled' },
    { status: 'refunded' },
  ]
})
```

This is equivalent to: `NOT cancelled AND NOT refunded`.

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('shop');
const products = db.collection('products');

// Exclude multiple status values
const validOrders = await db.collection('orders').find({
  $nor: [
    { status: 'cancelled' },
    { status: 'refunded' },
    { status: 'failed' },
  ]
}).toArray();

// Exclude multiple price ranges (find mid-range products)
const midRange = await products.find({
  $nor: [
    { price: { $lt: 10 } },    // not cheap
    { price: { $gt: 500 } },   // not luxury
  ]
}).toArray();

// Exclude documents matching conditions across different fields
const filtered = await products.find({
  $nor: [
    { category: 'discontinued' },
    { stock: 0 },
    { rating: { $lt: 2 } },
  ]
}).toArray();
```

## $nor vs. $nin

Both operators exclude values, but they serve different purposes:

| Operator | Use Case |
|----------|---------|
| `$nin` | Exclude values on a **single field**: `{ status: { $nin: ['a', 'b'] } }` |
| `$nor` | Exclude conditions across **multiple fields**: `$nor: [{field1: ...}, {field2: ...}]` |

```javascript
// These are equivalent for single-field exclusion:
products.find({ status: { $nin: ['cancelled', 'refunded'] } })
products.find({ $nor: [{ status: 'cancelled' }, { status: 'refunded' }] })

// $nor is needed for multi-field exclusion:
products.find({ $nor: [{ price: { $lt: 10 } }, { category: 'books' }] })
// Cannot express this with $nin alone
```

## $nor with Missing Fields

Like other negation operators, `$nor` also matches documents where the specified fields do not exist:

```javascript
// Returns documents where:
// 1. 'archived' is not true, AND
// 2. 'deleted' is not true
// ALSO includes documents where these fields are missing
const result = await products.find({
  $nor: [
    { archived: true },
    { deleted: true },
  ]
}).toArray();

// To match only documents where fields exist and are not true:
const strict = await products.find({
  archived: { $exists: true },
  deleted: { $exists: true },
  $nor: [
    { archived: true },
    { deleted: true },
  ]
}).toArray();
```

## $nor in Aggregation Pipeline

```javascript
const results = await db.collection('products').aggregate([
  {
    $match: {
      $nor: [
        { status: 'discontinued' },
        { price: { $lt: 5 } },
        { category: 'test' },
      ]
    }
  },
  { $group: { _id: '$category', count: { $sum: 1 } } },
]).toArray();
```

As a boolean expression (note that `$nor` is not available as an aggregation expression, so use `$not` with `$or` instead):

```javascript
const withFlags = await products.aggregate([
  {
    $project: {
      name: 1,
      isClean: {
        $not: [
          { $or: [
            { $eq: ['$status', 'discontinued'] },
            { $lt: ['$price', 5] },
            { $eq: ['$category', 'test'] },
          ]}
        ]
      }
    }
  }
]).toArray();
```

## PyMongo Usage

```python
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['shop']
orders = db['orders']

# Exclude multiple statuses
valid_orders = list(orders.find({
    '$nor': [
        {'status': 'cancelled'},
        {'status': 'refunded'},
        {'status': 'failed'},
    ]
}))

# Exclude outlier price ranges
mid_range = list(db['products'].find({
    '$nor': [
        {'price': {'$lt': 10}},
        {'price': {'$gt': 500}},
    ]
}))
```

## Combining $nor with Other Operators

```javascript
// Products that are active AND don't match any exclusion criteria
const results = await products.find({
  status: 'active',    // implicit AND
  $nor: [
    { price: { $lt: 5 } },
    { category: 'clearance' },
    { rating: { $lt: 3 } },
  ]
}).toArray();
```

## Summary

MongoDB's `$nor` operator matches documents that fail to match all conditions in an array - a logical NOR. It is most useful when you need to exclude multiple conditions across different fields simultaneously. For single-field exclusion, prefer `$nin` for clarity and better index utilization. Remember that `$nor` also matches documents with missing fields, so add `$exists: true` checks when you need to restrict to documents where the field is present.
