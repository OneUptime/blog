# How to Use $gt and $gte for Greater Than Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $gt, $gte, Comparison Operator, Range Queries, Query

Description: Learn how to use MongoDB's $gt (greater than) and $gte (greater than or equal) operators for range queries on numbers, dates, and strings with index optimization.

---

## What Are $gt and $gte?

- `$gt` - matches documents where the field value is **strictly greater than** the specified value
- `$gte` - matches documents where the field value is **greater than or equal to** the specified value

Both work on numbers, dates, strings (lexicographic comparison), and other ordered BSON types.

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('shop');
const products = db.collection('products');

// Find products priced strictly above $100
const expensive = await products
  .find({ price: { $gt: 100 } })
  .toArray();

// Find products priced $100 or more (inclusive)
const hundredPlus = await products
  .find({ price: { $gte: 100 } })
  .toArray();

// Find users who are adults (18 or older)
const adults = await db.collection('users')
  .find({ age: { $gte: 18 } })
  .toArray();
```

## Date Range Queries

```javascript
const orders = db.collection('orders');

// Orders placed after a specific date
const recentOrders = await orders.find({
  createdAt: { $gt: new Date('2024-01-01') }
}).toArray();

// Orders from today or later
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayOrders = await orders.find({
  createdAt: { $gte: today }
}).toArray();
```

## Combining $gt and $gte with $lt and $lte for Ranges

```javascript
// Products priced between $50 and $200 (exclusive both ends)
const midRange = await products.find({
  price: { $gt: 50, $lt: 200 }
}).toArray();

// Products priced between $50 and $200 (inclusive both ends)
const midRangeInclusive = await products.find({
  price: { $gte: 50, $lte: 200 }
}).toArray();

// Orders in a date range (last 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const recent = await orders.find({
  createdAt: { $gte: thirtyDaysAgo, $lte: new Date() }
}).toArray();
```

## String Comparisons

`$gt` and `$gte` use lexicographic (alphabetical) ordering for strings:

```javascript
// Products with names starting after 'M' alphabetically
const afterM = await products.find({
  name: { $gt: 'M' }
}).toArray();

// Find usernames from 'alice' onward alphabetically
const users = await db.collection('users').find({
  username: { $gte: 'alice' }
}).toArray();
```

## Using with the Aggregation Pipeline

```javascript
const results = await products.aggregate([
  { $match: { price: { $gte: 50 } } },
  { $group: { _id: '$category', avgPrice: { $avg: '$price' } } },
  { $match: { avgPrice: { $gt: 75 } } },
  { $sort: { avgPrice: -1 } },
]).toArray();
```

In `$project` or `$addFields`, `$gt` and `$gte` return booleans:

```javascript
const results = await products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      isPremium: { $gte: ['$price', 200] },  // boolean: true if price >= 200
    }
  }
]).toArray();
```

## PyMongo Usage

```python
from pymongo import MongoClient
from datetime import datetime, timedelta

client = MongoClient('mongodb://localhost:27017')
db = client['shop']
products = db['products']

# Price greater than 100
expensive = list(products.find({'price': {'$gt': 100}}))

# Price range with $gte
mid_range = list(products.find({'price': {'$gte': 50, '$lte': 200}}))

# Date range
thirty_days_ago = datetime.utcnow() - timedelta(days=30)
recent = list(db['orders'].find({'createdAt': {'$gte': thirty_days_ago}}))
```

## Index Optimization

Range queries with `$gt` and `$gte` benefit significantly from indexes:

```javascript
// Create index on price for range queries
await products.createIndex({ price: 1 });

// Compound index for filtered range queries
await products.createIndex({ category: 1, price: 1 });

// Verify index usage
const plan = await products
  .find({ category: 'electronics', price: { $gte: 100 } })
  .explain('executionStats');

console.log(plan.executionStats.executionStages.inputStage.stage);
// Should show 'IXSCAN' (index scan)
```

For date range queries:

```javascript
await db.collection('orders').createIndex({ createdAt: -1 });
// Descending index is efficient for "most recent" queries
```

## Summary

MongoDB's `$gt` and `$gte` operators provide straightforward range filtering on numeric, date, and string fields. Use `$gt` for strict greater-than comparisons and `$gte` when the boundary value should be included. Combine with `$lt` and `$lte` for bounded range queries. Always create indexes on fields used in range queries, and use compound indexes when filtering on multiple fields simultaneously.
