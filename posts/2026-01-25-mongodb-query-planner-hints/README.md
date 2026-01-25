# How to Use Query Planner Hints in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query Optimization, Hints, Performance, Indexes

Description: Learn how to use MongoDB query hints to override the query planner, force specific index usage, and optimize query performance with practical examples.

---

MongoDB's query planner usually picks the best index automatically, but sometimes it makes suboptimal choices. Query hints let you override the planner and force specific index usage. This is useful when you know your data distribution better than the statistics suggest, or when you need predictable query plans for specific workloads.

## Understanding the Query Planner

Before using hints, understand how MongoDB selects query plans.

```javascript
// See what plan the query planner chooses
const explanation = await collection.find({
  status: 'active',
  createdAt: { $gte: new Date('2024-01-01') }
}).explain('executionStats');

console.log('Winning plan:', explanation.queryPlanner.winningPlan);
console.log('Rejected plans:', explanation.queryPlanner.rejectedPlans);
console.log('Execution time:', explanation.executionStats.executionTimeMillis);
console.log('Docs examined:', explanation.executionStats.totalDocsExamined);
console.log('Docs returned:', explanation.executionStats.nReturned);
```

## Basic Hint Usage

```javascript
// Force use of a specific index by name
const results = await collection.find({
  status: 'active',
  userId: 'user123'
}).hint('status_1_userId_1').toArray();

// Force use of an index by key pattern
const results2 = await collection.find({
  status: 'active',
  userId: 'user123'
}).hint({ status: 1, userId: 1 }).toArray();

// Force a collection scan (no index)
const results3 = await collection.find({
  status: 'active'
}).hint({ $natural: 1 }).toArray();
```

## When to Use Hints

### Case 1: Query Planner Chooses Wrong Index

```javascript
// Setup: Collection with multiple indexes
await collection.createIndex({ status: 1 });
await collection.createIndex({ createdAt: -1 });
await collection.createIndex({ status: 1, createdAt: -1 });

// Query that might use wrong index
const query = {
  status: 'pending',  // 5% of documents
  createdAt: { $gte: new Date('2024-01-01') }  // 90% of documents
};

// Without hint - planner might choose createdAt index
// because it sees createdAt has more selective range
const badPlan = await collection.find(query).explain();
console.log('Without hint:', badPlan.queryPlanner.winningPlan.inputStage.indexName);

// With hint - force compound index which is actually better
const goodPlan = await collection.find(query)
  .hint({ status: 1, createdAt: -1 })
  .explain();
console.log('With hint:', goodPlan.queryPlanner.winningPlan.inputStage.indexName);
```

### Case 2: Ensuring Covered Queries

```javascript
// Index covers all fields needed for the query
await collection.createIndex({
  category: 1,
  price: 1,
  name: 1
});

// Force covered query by hinting the covering index
const products = await collection.find(
  { category: 'electronics', price: { $lt: 100 } },
  { projection: { _id: 0, category: 1, price: 1, name: 1 } }  // Only indexed fields
).hint({ category: 1, price: 1, name: 1 }).toArray();

// Verify it's a covered query
const explanation = await collection.find(
  { category: 'electronics', price: { $lt: 100 } },
  { projection: { _id: 0, category: 1, price: 1, name: 1 } }
).hint({ category: 1, price: 1, name: 1 }).explain('executionStats');

console.log('Total keys examined:', explanation.executionStats.totalKeysExamined);
console.log('Total docs examined:', explanation.executionStats.totalDocsExamined);
// Covered query: docsExamined should be 0
```

### Case 3: Sorting Without Additional Index Scan

```javascript
// Index that supports both filter and sort
await collection.createIndex({ userId: 1, timestamp: -1 });

// Force index use for sort
const userEvents = await collection.find({ userId: 'user123' })
  .sort({ timestamp: -1 })
  .hint({ userId: 1, timestamp: -1 })
  .limit(100)
  .toArray();

// Without hint, planner might use a different index
// and perform in-memory sort
```

## Hints in Aggregation Pipelines

```javascript
// Use hint in aggregation
const results = await collection.aggregate([
  { $match: { status: 'active', region: 'us-east' } },
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
], {
  hint: { status: 1, region: 1 }
}).toArray();

// Explain aggregation with hint
const aggExplain = await collection.aggregate([
  { $match: { status: 'active', region: 'us-east' } },
  { $group: { _id: '$category', count: { $sum: 1 } } }
], {
  hint: { status: 1, region: 1 },
  explain: true
});
```

## Hint with Update and Delete Operations

```javascript
// Hint on updateMany
await collection.updateMany(
  { status: 'pending', createdAt: { $lt: new Date('2024-01-01') } },
  { $set: { status: 'expired' } },
  { hint: { status: 1, createdAt: 1 } }
);

// Hint on deleteMany
await collection.deleteMany(
  { status: 'deleted', deletedAt: { $lt: new Date('2023-01-01') } },
  { hint: { status: 1, deletedAt: 1 } }
);

// Hint on findOneAndUpdate
const updated = await collection.findOneAndUpdate(
  { orderId: 'ORD-123', status: 'pending' },
  { $set: { status: 'processing' } },
  {
    hint: { orderId: 1, status: 1 },
    returnDocument: 'after'
  }
);
```

## Comparing Query Plans

```javascript
// Compare performance with different indexes
async function compareIndexPerformance(collection, query, indexes) {
  const results = [];

  for (const indexHint of indexes) {
    const explanation = await collection.find(query)
      .hint(indexHint)
      .explain('executionStats');

    results.push({
      index: JSON.stringify(indexHint),
      executionTimeMs: explanation.executionStats.executionTimeMillis,
      docsExamined: explanation.executionStats.totalDocsExamined,
      keysExamined: explanation.executionStats.totalKeysExamined,
      nReturned: explanation.executionStats.nReturned
    });
  }

  // Sort by execution time
  results.sort((a, b) => a.executionTimeMs - b.executionTimeMs);

  console.table(results);
  return results;
}

// Usage
await compareIndexPerformance(
  collection,
  { status: 'active', type: 'premium', createdAt: { $gte: new Date('2024-01-01') } },
  [
    { status: 1 },
    { type: 1 },
    { createdAt: -1 },
    { status: 1, type: 1 },
    { status: 1, type: 1, createdAt: -1 }
  ]
);
```

## Natural Order Hint

Force MongoDB to scan documents in natural (insertion) order.

```javascript
// Scan in insertion order
const oldestFirst = await collection.find({})
  .hint({ $natural: 1 })
  .limit(10)
  .toArray();

// Scan in reverse insertion order
const newestFirst = await collection.find({})
  .hint({ $natural: -1 })
  .limit(10)
  .toArray();

// Useful for:
// - Capped collections (natural order is insertion order)
// - When you know index won't help
// - Debugging to compare index vs scan performance
```

## Min and Max for Index Range Scans

```javascript
// Constrain index scan to specific key range
// Must use hint to specify which index

await collection.createIndex({ score: 1 });

// Find documents with score between 80 and 90
const highScorers = await collection.find({})
  .hint({ score: 1 })
  .min({ score: 80 })
  .max({ score: 90 })
  .toArray();

// Compound index range
await collection.createIndex({ category: 1, price: 1 });

const products = await collection.find({})
  .hint({ category: 1, price: 1 })
  .min({ category: 'electronics', price: 100 })
  .max({ category: 'electronics', price: 500 })
  .toArray();
```

## Hint Best Practices

```javascript
// DO: Use hints for known problematic queries
// After analyzing with explain() and confirming better performance
const optimizedQuery = await collection.find({
  status: 'active',
  createdAt: { $gte: cutoffDate }
}).hint({ status: 1, createdAt: -1 });

// DO: Document why hint is needed
// This query uses hint because:
// - Status has high cardinality in this collection
// - Query planner incorrectly favors createdAt index
// - Measured 5x improvement with compound index hint
const documentedQuery = await collection.find(query)
  .hint('status_1_createdAt_-1');

// DON'T: Use hints without measurement
// Bad: assuming this is faster without testing
const untested = await collection.find(query)
  .hint({ someIndex: 1 });  // May actually be slower!

// DON'T: Hardcode hints that may become invalid
// If index is dropped, query will fail
try {
  await collection.find(query).hint('nonexistent_index');
} catch (error) {
  // Error: hint index not found
  console.error('Hint index missing:', error.message);
}
```

## Monitoring Hint Effectiveness

```javascript
// Track query performance with and without hints
async function monitorHintEffectiveness(collection, query, hint) {
  // Run without hint
  const withoutHint = await measureQuery(collection, query, null);

  // Run with hint
  const withHint = await measureQuery(collection, query, hint);

  const improvement = (
    (withoutHint.executionTimeMs - withHint.executionTimeMs) /
    withoutHint.executionTimeMs * 100
  ).toFixed(2);

  console.log(`Without hint: ${withoutHint.executionTimeMs}ms`);
  console.log(`With hint: ${withHint.executionTimeMs}ms`);
  console.log(`Improvement: ${improvement}%`);

  // Alert if hint is actually slower
  if (withHint.executionTimeMs > withoutHint.executionTimeMs * 1.1) {
    console.warn('WARNING: Hint is slower than planner choice!');
  }

  return { withoutHint, withHint, improvement };
}

async function measureQuery(collection, query, hint) {
  const startTime = Date.now();

  let cursor = collection.find(query);
  if (hint) {
    cursor = cursor.hint(hint);
  }

  const explanation = await cursor.explain('executionStats');

  return {
    executionTimeMs: explanation.executionStats.executionTimeMillis,
    docsExamined: explanation.executionStats.totalDocsExamined,
    keysExamined: explanation.executionStats.totalKeysExamined,
    indexUsed: explanation.queryPlanner.winningPlan.inputStage?.indexName || 'COLLSCAN'
  };
}
```

## When NOT to Use Hints

Hints override the query planner, which can backfire:

```javascript
// Data distribution changes over time
// A hint that was optimal 6 months ago may be harmful now

// Example: status distribution changed
// Before: 95% active, 5% inactive
// Now: 50% active, 50% inactive

// Original hint was optimal for finding 'inactive' (rare)
// Now it may be suboptimal

// Solution: Periodically re-evaluate hints
async function validateHints(collection, queries) {
  for (const { query, hint, description } of queries) {
    const result = await monitorHintEffectiveness(collection, query, hint);

    if (parseFloat(result.improvement) < 0) {
      console.warn(`REVIEW HINT: ${description}`);
      console.warn(`Hint is now ${Math.abs(result.improvement)}% slower`);
    }
  }
}
```

## Summary

Query hints are a powerful optimization tool when used correctly:

- Always measure before and after with `explain()`
- Use hints when you know the query planner makes wrong choices
- Document why each hint is needed
- Periodically validate that hints are still beneficial
- Handle errors gracefully if indexes are dropped
- Prefer fixing the underlying issue (better indexes, query rewrite) over permanent hints

Hints are a scalpel, not a hammer. Use them precisely for specific problems rather than applying them broadly.
