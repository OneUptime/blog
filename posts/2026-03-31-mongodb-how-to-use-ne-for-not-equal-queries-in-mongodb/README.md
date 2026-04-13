# How to Use $ne for Not Equal Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $ne, Not Equal, Query Operator, Filtering, Node.js

Description: Learn how to use the MongoDB $ne (not equal) operator to exclude documents where a field equals a specific value, with practical examples and index usage guidance.

---

## What Is the $ne Operator?

The `$ne` operator selects documents where the field value is **not equal** to the specified value. It also matches documents where the field does not exist.

```javascript
// Find all products that are NOT in the 'electronics' category
db.products.find({ category: { $ne: 'electronics' } })
```

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('shop');
const orders = db.collection('orders');

// Find orders that are not 'cancelled'
const active = await orders
  .find({ status: { $ne: 'cancelled' } })
  .toArray();

// Find products not priced at zero
const paidItems = await orders
  .find({ price: { $ne: 0 } })
  .toArray();

// Find documents where a field exists and is not null (excludes null and missing fields)
const withName = await orders
  .find({ customerName: { $ne: null } })
  .toArray();
```

## $ne with Various Data Types

```javascript
// String comparison
const nonAdmin = await db.collection('users')
  .find({ role: { $ne: 'admin' } })
  .toArray();

// Number comparison
const nonZeroStock = await db.collection('products')
  .find({ stock: { $ne: 0 } })
  .toArray();

// Boolean
const notDeleted = await db.collection('items')
  .find({ deleted: { $ne: true } })
  .toArray();

// ObjectId
const { ObjectId } = require('mongodb');
const othersOnly = await db.collection('posts')
  .find({ authorId: { $ne: new ObjectId('64f1a2b3c4d5e6f7a8b9c0d1') } })
  .toArray();
```

## $ne with Arrays

When the field is an array, `$ne` matches documents where the specified value does NOT appear in the array:

```javascript
const docs = [
  { _id: 1, tags: ['sale', 'new'] },
  { _id: 2, tags: ['clearance'] },
  { _id: 3, tags: ['featured'] },
];

// Returns docs 2 and 3 (those that do not have 'sale' in their tags array)
const noSale = await collection.find({ tags: { $ne: 'sale' } }).toArray();
```

## $ne in Aggregation Pipelines

In aggregation, `$ne` returns a boolean expression:

```javascript
const results = await db.collection('orders').aggregate([
  {
    $project: {
      orderId: 1,
      status: 1,
      isPending: { $ne: ['$status', 'completed'] },  // true if not completed
    }
  }
]).toArray();
```

Use `$match` with `$ne` to filter in aggregation:

```javascript
const results = await db.collection('orders').aggregate([
  { $match: { status: { $ne: 'cancelled' } } },
  { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
]).toArray();
```

## PyMongo Usage

```python
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017')
db = client['shop']
orders = db['orders']

# Find non-cancelled orders
active_orders = list(orders.find({'status': {'$ne': 'cancelled'}}))

# Find documents where field does not equal a number
nonzero = list(orders.find({'price': {'$ne': 0}}))
```

## Index Behavior with $ne

`$ne` queries generally do not use indexes efficiently because they match a large portion of the collection. MongoDB often uses a collection scan for `$ne` queries.

```javascript
// Check query plan
const plan = await collection
  .find({ status: { $ne: 'cancelled' } })
  .explain('executionStats');

console.log(plan.executionStats.executionStages.stage);
// Often: 'COLLSCAN' - not using an index
```

For better performance when excluding one value from many, consider:

```javascript
// Instead of $ne, use $in to specify the values you DO want
const active = await orders.find({
  status: { $in: ['pending', 'processing', 'shipped', 'completed'] }
}).toArray();
// This uses an index on 'status' efficiently
```

## Combining $ne with Other Operators

```javascript
// Orders not cancelled AND price >= 50
const results = await orders.find({
  status: { $ne: 'cancelled' },
  price: { $gte: 50 },
}).toArray();

// Items not in stock AND not discontinued
const results2 = await collection.find({
  $and: [
    { status: { $ne: 'in_stock' } },
    { status: { $ne: 'discontinued' } },
  ]
}).toArray();
// Equivalent to: { status: { $nin: ['in_stock', 'discontinued'] } }
```

## Summary

The MongoDB `$ne` operator excludes documents where a field equals a specified value, and also matches documents where the field does not exist. It is useful for filtering out a single known value, but be aware that `$ne` queries typically require a full collection scan since they match most documents. When you need to exclude multiple values, prefer `$nin`; when you know the set of values to include, use `$in` for better index utilization.
