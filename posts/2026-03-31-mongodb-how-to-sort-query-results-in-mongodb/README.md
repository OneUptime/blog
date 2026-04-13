# How to Sort Query Results in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sort, Query, Aggregation, Index, Node.js

Description: Learn how to sort MongoDB query results using the sort() method, aggregate $sort stage, and index optimization for efficient ordering of documents.

---

## Basic Sorting with sort()

MongoDB's `sort()` method orders query results. Pass a document with field names and sort direction: `1` for ascending, `-1` for descending.

```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('mydb');
const collection = db.collection('products');

// Sort by price ascending
const cheapFirst = await collection.find({}).sort({ price: 1 }).toArray();

// Sort by price descending
const expensiveFirst = await collection.find({}).sort({ price: -1 }).toArray();

// Sort by category ascending, then by price ascending (multi-field sort)
const sorted = await collection.find({}).sort({ category: 1, price: 1 }).toArray();
```

## Sorting with Filters

Combine `find()` filters with `sort()`:

```javascript
// Find active products, sort by name ascending
const activeProducts = await collection
  .find({ status: 'active' })
  .sort({ name: 1 })
  .toArray();

// Find products in a price range, sort by rating descending
const topRated = await collection
  .find({ price: { $gte: 10, $lte: 100 } })
  .sort({ rating: -1 })
  .limit(10)
  .toArray();
```

## Sorting with the Aggregation Pipeline

Use `$sort` in an aggregation pipeline for complex ordering:

```javascript
// Sort after grouping
const results = await collection.aggregate([
  { $match: { status: 'active' } },
  {
    $group: {
      _id: '$category',
      avgPrice: { $avg: '$price' },
      count: { $sum: 1 },
    }
  },
  { $sort: { avgPrice: -1 } },  // Sort by average price descending
]).toArray();
```

## Sorting with PyMongo

```python
from pymongo import MongoClient, ASCENDING, DESCENDING

client = MongoClient('mongodb://localhost:27017')
db = client['mydb']
collection = db['products']

# Ascending sort
for doc in collection.find().sort('price', ASCENDING):
    print(doc['name'], doc['price'])

# Multi-field sort
for doc in collection.find().sort([('category', ASCENDING), ('price', DESCENDING)]):
    print(doc)
```

## Sorting Text Search Results by Score

When using text search, sort by the text score:

```javascript
// First ensure a text index exists
await collection.createIndex({ name: 'text', description: 'text' });

// Search and sort by relevance score
const searchResults = await collection
  .find(
    { $text: { $search: 'wireless headphones' } },
    { projection: { score: { $meta: 'textScore' } } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .toArray();
```

## Sorting with Null and Missing Fields

MongoDB places null values and missing fields at the beginning of ascending sorts:

```javascript
// ascending: null/missing appear first
// descending: null/missing appear last

// To push nulls to the end in ascending sort, use aggregation
const results = await collection.aggregate([
  {
    $addFields: {
      sortField: {
        $ifNull: ['$price', 999999]  // replace null with a large number
      }
    }
  },
  { $sort: { sortField: 1 } },
  { $unset: 'sortField' },
]).toArray();
```

## Index Optimization for Sort

Sorting without an index triggers an in-memory sort, which has a 32 MB limit:

```javascript
// Create an index to support sort
await collection.createIndex({ price: 1 });

// For multi-field sort, create a compound index in the same direction
await collection.createIndex({ category: 1, price: -1 });

// Check if sort uses an index with explain()
const plan = await collection
  .find({ category: 'electronics' })
  .sort({ price: -1 })
  .explain('executionStats');

console.log(JSON.stringify(plan.queryPlanner.winningPlan, null, 2));
// If a 'SORT' stage appears in the plan, it is an in-memory sort (slower)
// If no 'SORT' stage appears, the index is providing the sort order
```

## Sort Memory Limit

By default, in-memory sorts are limited to 32 MB. For large result sets, allow disk use:

```javascript
// In aggregate, allow disk use for large sorts
const results = await collection.aggregate([
  { $sort: { price: 1 } }
], { allowDiskUse: true }).toArray();
```

## Summary

MongoDB's `sort()` method and `$sort` aggregation stage provide flexible ordering for query results. Use `1` for ascending and `-1` for descending, and combine multiple fields for compound sorting. Always create indexes that match your sort fields to avoid expensive in-memory sorts. For text search, sort by `$meta: 'textScore'` to return the most relevant results first.
