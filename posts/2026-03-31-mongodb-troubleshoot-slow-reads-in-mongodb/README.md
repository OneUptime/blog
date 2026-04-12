# How to Troubleshoot Slow Reads in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Performance

Description: Diagnose and fix slow MongoDB read operations using explain plans, index analysis, projection optimization, and read preference tuning.

---

## Step 1: Enable the Query Profiler

The slow query profiler is your primary diagnostic tool:

```javascript
// Profile queries slower than 50ms
db.setProfilingLevel(1, { slowms: 50 })

// Find the slowest reads
db.system.profile.find({ op: 'query' }).sort({ millis: -1 }).limit(10).forEach(p => {
  print(`${p.millis}ms | ${p.ns}`)
  printjson(p.command)
  print('Plan:', p.planSummary)
  print('---')
})
```

## Step 2: Use explain() to Analyze Query Plans

```javascript
var result = db.orders.find({
  status: 'pending',
  createdAt: { $gte: new Date('2024-01-01') },
}).explain('executionStats')

print('Stage:', result.executionStats.executionStages.stage)
print('Docs examined:', result.executionStats.totalDocsExamined)
print('Docs returned:', result.executionStats.nReturned)
print('Time (ms):', result.executionStats.executionTimeMillis)
```

**Red flags:**
- `COLLSCAN` stage - no index used
- `totalDocsExamined` much higher than `nReturned` - low selectivity
- High `executionTimeMillis` with low document count - sort or lookup overhead

## Step 3: Fix Missing or Wrong Indexes

```javascript
// Identify and create the correct compound index
// Rule: Equality fields first, then range, then sort
db.orders.createIndex({
  status: 1,        // equality
  createdAt: -1,    // range/sort
})

// Check index usage statistics
db.orders.aggregate([{ $indexStats: {} }])
```

Remove unused indexes that waste memory and slow writes:

```javascript
// Find indexes with zero accesses (accumulated since last restart)
db.orders.aggregate([
  { $indexStats: {} },
  { $match: { 'accesses.ops': 0 } },
])
```

## Step 4: Use Projections to Reduce Data Transfer

Fetching entire documents when you only need a few fields wastes I/O and network bandwidth:

```javascript
// Slow: fetches entire document including large description field
db.products.find({ category: 'electronics' })

// Faster: only return needed fields
db.products.find({ category: 'electronics' }, { name: 1, price: 1, _id: 0 })
```

For frequently projected subsets, consider covered queries (all fields in the index):

```javascript
db.products.createIndex({ category: 1, name: 1, price: 1 })
// This query is now covered - reads only the index, not the collection
db.products.find({ category: 'electronics' }, { name: 1, price: 1, _id: 0 })
```

## Step 5: Tune Read Preferences for Read-Heavy Workloads

Distribute reads across secondaries to reduce primary load:

```javascript
const { MongoClient, ReadPreference } = require('mongodb')

const client = new MongoClient(uri, {
  readPreference: ReadPreference.SECONDARY_PREFERRED,
})

// Or per-operation for analytics queries
const analyticsResult = await db.collection('events').find(
  { createdAt: { $gte: startDate } }
).withReadPreference(ReadPreference.SECONDARY).toArray()
```

## Step 6: Add Database-Level Indexes for Sorts

Sorting without an index causes an in-memory sort (bounded at 100 MB):

```javascript
// Check if sort used an index
db.events.find({ userId: 'u1' }).sort({ createdAt: -1 }).explain('executionStats')
// Look for SORT stage - means no index was used for sort

// Fix with compound index that covers sort direction
db.events.createIndex({ userId: 1, createdAt: -1 })
```

## Summary

Slow MongoDB reads follow a predictable pattern: missing or mismatched indexes causing collection scans, over-fetching document fields, and missing covered queries. Use the profiler to find slow queries, explain() to diagnose the execution plan, and compound indexes following the equality-range-sort rule to fix them. For high read volume, distribute load across secondary nodes using read preference settings.
