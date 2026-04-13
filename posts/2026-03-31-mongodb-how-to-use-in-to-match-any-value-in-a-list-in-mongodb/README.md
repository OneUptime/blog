# How to Use $in to Match Any Value in a List in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $in, Query Operator, Array Match, Filter, Node.js

Description: Learn how to use MongoDB's $in operator to match documents where a field equals any value in a specified list, with practical examples and performance tips.

---

## What Is the $in Operator?

The `$in` operator selects documents where the value of a field equals **any value** in a specified array. It is the equivalent of SQL's `IN` clause and is more efficient than chaining multiple `$or` conditions on the same field.

```javascript
// SQL equivalent: WHERE status IN ('active', 'pending', 'processing')
db.orders.find({ status: { $in: ['active', 'pending', 'processing'] } })
```

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('shop');
const products = db.collection('products');

// Match any of several string values
const selected = await products.find({
  category: { $in: ['electronics', 'computers', 'gadgets'] }
}).toArray();

// Match any of several numeric values
const specificPrices = await products.find({
  price: { $in: [9.99, 19.99, 29.99] }
}).toArray();

// Match ObjectIds from a list
const { ObjectId } = require('mongodb');
const ids = ['64f1a2b3c4d5e6f7a8b9c0d1', '64f1a2b3c4d5e6f7a8b9c0d2']
  .map(id => new ObjectId(id));

const byIds = await products.find({
  _id: { $in: ids }
}).toArray();
```

## $in with Array Fields

When the target field is an array in the document, `$in` matches if ANY element in the document's array matches ANY value in the `$in` list:

```javascript
const docs = [
  { _id: 1, tags: ['sale', 'new'] },
  { _id: 2, tags: ['clearance', 'summer'] },
  { _id: 3, tags: ['featured'] },
];

// Returns docs 1 and 2 (have 'sale' or 'clearance')
await products.find({ tags: { $in: ['sale', 'clearance'] } }).toArray();
```

## Using $in in Aggregation

In `$match` stage:

```javascript
const results = await products.aggregate([
  { $match: { status: { $in: ['active', 'featured'] } } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
]).toArray();
```

As a boolean expression in `$project`:

```javascript
const results = await products.aggregate([
  {
    $project: {
      name: 1,
      isHighlighted: { $in: ['$status', ['featured', 'bestseller', 'new']] },
    }
  }
]).toArray();
```

## Practical Example - Fetch Multiple Records by ID

A very common use case is fetching multiple specific documents:

```javascript
async function getUsersByIds(userIds) {
  const { ObjectId } = require('mongodb');
  const objectIds = userIds.map(id => new ObjectId(id));

  return db.collection('users')
    .find({ _id: { $in: objectIds } })
    .toArray();
}

const users = await getUsersByIds([
  '64f1a2b3c4d5e6f7a8b9c0d1',
  '64f1a2b3c4d5e6f7a8b9c0d2',
  '64f1a2b3c4d5e6f7a8b9c0d3',
]);
```

## PyMongo Usage

```python
from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb://localhost:27017')
db = client['shop']
products = db['products']

# Match any of several categories
results = list(products.find({'category': {'$in': ['electronics', 'computers']}}))

# Fetch by multiple IDs
ids = [ObjectId('64f1a2b3c4d5e6f7a8b9c0d1'), ObjectId('64f1a2b3c4d5e6f7a8b9c0d2')]
docs = list(products.find({'_id': {'$in': ids}}))
```

## $in with Regular Expressions

`$in` accepts regex patterns:

```javascript
// Match names starting with 'Apple' or 'Samsung'
const topBrands = await products.find({
  name: { $in: [/^Apple/i, /^Samsung/i] }
}).toArray();
```

## Index Usage

`$in` uses indexes efficiently, especially on indexed fields:

```javascript
// Create an index on the field used with $in
await products.createIndex({ category: 1 });
await products.createIndex({ status: 1 });

// This query uses the index on 'status'
const plan = await products
  .find({ status: { $in: ['active', 'pending'] } })
  .explain('executionStats');

console.log(plan.executionStats.executionStages.inputStage.stage);
// 'IXSCAN' - using the index
```

For `_id` fields, the index is always present (primary key index).

## $in vs. Multiple $or Conditions

Using `$in` on the same field is more efficient and readable than `$or`:

```javascript
// Prefer this:
await products.find({ category: { $in: ['a', 'b', 'c'] } })

// Over this (same result, less efficient, harder to read):
await products.find({
  $or: [
    { category: 'a' },
    { category: 'b' },
    { category: 'c' },
  ]
})
```

## Summary

The MongoDB `$in` operator is a concise, efficient way to match documents where a field equals any value from a list. It is ideal for fetching multiple records by ID, filtering by a set of statuses, or matching against a list of allowed values. Unlike multiple `$or` conditions on the same field, `$in` is internally optimized, uses indexes efficiently, and produces cleaner query code.
