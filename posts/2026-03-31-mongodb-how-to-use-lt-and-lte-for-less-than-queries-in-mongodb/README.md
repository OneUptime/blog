# How to Use $lt and $lte for Less Than Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $lt, $lte, Comparison Operator, Range Queries, Query

Description: Learn how to use MongoDB's $lt (less than) and $lte (less than or equal) operators to filter documents by value ranges on numbers, dates, and strings.

---

## What Are $lt and $lte?

- `$lt` - matches documents where the field value is **strictly less than** the specified value
- `$lte` - matches documents where the field value is **less than or equal to** the specified value

These are complementary to `$gt` and `$gte` and are most often used together for range queries.

## Basic Usage

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('shop');
const products = db.collection('products');

// Find products under $50
const cheap = await products
  .find({ price: { $lt: 50 } })
  .toArray();

// Find products $50 or less (inclusive)
const fiftyOrLess = await products
  .find({ price: { $lte: 50 } })
  .toArray();

// Find items with fewer than 10 in stock
const lowStock = await db.collection('inventory')
  .find({ quantity: { $lt: 10 } })
  .toArray();
```

## Date Range Queries

```javascript
const orders = db.collection('orders');

// Orders placed before a specific date
const oldOrders = await orders.find({
  createdAt: { $lt: new Date('2023-01-01') }
}).toArray();

// Orders placed up to and including end of year
const beforeEOY = await orders.find({
  createdAt: { $lte: new Date('2024-12-31T23:59:59.999Z') }
}).toArray();
```

## Combining for Bounded Ranges

The most common pattern is combining `$gte` and `$lte` (or `$gt` and `$lt`) on the same field:

```javascript
// Products in $10 to $50 price range (inclusive)
const budget = await products.find({
  price: { $gte: 10, $lte: 50 }
}).toArray();

// Products from $10 up to (but not including) $50
const budgetExclusive = await products.find({
  price: { $gte: 10, $lt: 50 }
}).toArray();

// Events happening within the next 7 days
const now = new Date();
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const upcomingEvents = await db.collection('events').find({
  startDate: { $gte: now, $lte: nextWeek }
}).toArray();
```

## String Comparison

Like `$gt`, `$lt` uses lexicographic ordering for strings:

```javascript
// Users with usernames alphabetically before 'n'
const earlyAlpha = await db.collection('users').find({
  username: { $lt: 'n' }
}).toArray();
// Matches: 'alice', 'bob', 'charlie', 'mike'
// Does not match: 'nancy', 'oscar', 'zoe'
```

## Aggregation Pipeline Usage

```javascript
// Filter with $match
const results = await products.aggregate([
  { $match: { price: { $lte: 100 } } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
]).toArray();

// Boolean expression in $project
const withLabel = await products.aggregate([
  {
    $project: {
      name: 1,
      price: 1,
      isBudget: { $lte: ['$price', 50] },      // true if price <= 50
      isAffordable: { $lt: ['$price', 100] },   // true if price < 100
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

# Price less than 50
cheap = list(products.find({'price': {'$lt': 50}}))

# Price range (inclusive both ends)
budget = list(products.find({'price': {'$gte': 10, '$lte': 50}}))

# Date: orders before end of last year
cutoff = datetime(2023, 12, 31, 23, 59, 59)
old_orders = list(db['orders'].find({'createdAt': {'$lte': cutoff}}))
```

## Practical Example - Inventory Alert Query

```javascript
async function findLowAndCriticalStock() {
  const inventory = db.collection('inventory');

  // Critical: 0 to 4 items
  const critical = await inventory.find({
    quantity: { $gte: 0, $lte: 4 }
  }).toArray();

  // Low: 5 to 19 items
  const low = await inventory.find({
    quantity: { $gte: 5, $lt: 20 }
  }).toArray();

  return { critical, low };
}
```

## Index Usage

```javascript
// Create ascending index on price
await products.createIndex({ price: 1 });

// For queries that filter AND sort
await products.createIndex({ category: 1, price: 1 });

// Verify - should show IXSCAN not COLLSCAN
const plan = await products
  .find({ price: { $lte: 100 } })
  .explain('executionStats');

const stage = plan.executionStats.executionStages.stage;
console.log(`Query stage: ${stage}`);
```

## Summary

MongoDB's `$lt` and `$lte` operators filter documents where a field is less than or less than or equal to a specified value, respectively. They are most commonly combined with `$gte` to define bounded ranges. Both work on numbers, dates, and strings. Create indexes on fields used in range queries to ensure MongoDB uses an efficient index scan rather than a full collection scan.
