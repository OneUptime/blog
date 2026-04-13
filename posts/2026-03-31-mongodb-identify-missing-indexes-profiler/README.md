# How to Identify Missing Indexes Using MongoDB Profiler Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Profiler, Index, Query Optimization, Performance

Description: Use MongoDB profiler data to systematically identify missing indexes by analyzing COLLSCAN patterns, examine-to-return ratios, and slow query shapes.

---

Missing indexes are the most common cause of slow MongoDB queries. The profiler captures exactly what you need to find them: the query filter, the plan used, and how many documents were examined versus returned.

## Step 1 - Enable Profiling

```javascript
// Profile all operations slower than 100ms
db.setProfilingLevel(1, { slowms: 100 });
```

Let it run for at least 30-60 minutes during representative traffic.

## Step 2 - Find All Collection Scans

Collection scans are the strongest signal of a missing index:

```javascript
db.system.profile.find(
  { planSummary: "COLLSCAN", op: { $in: ["query", "update", "remove"] } },
  { ns: 1, command: 1, millis: 1, docsExamined: 1, nreturned: 1, planSummary: 1 }
).sort({ millis: -1 }).limit(20);
```

Every COLLSCAN is a candidate for an index. Not every one needs an index (some collections are tiny), but any COLLSCAN on a large collection with significant `docsExamined` definitely does.

## Step 3 - Aggregate by Namespace and Filter Shape

Group COLLSCANs by collection to prioritize:

```javascript
db.system.profile.aggregate([
  { $match: { planSummary: "COLLSCAN", millis: { $gt: 50 } } },
  {
    $group: {
      _id: "$ns",
      occurrences: { $sum: 1 },
      totalMs:     { $sum: "$millis" },
      avgMs:       { $avg: "$millis" },
      totalDocEx:  { $sum: "$docsExamined" }
    }
  },
  { $sort: { totalMs: -1 } },
  { $limit: 10 }
]);
```

Focus on namespaces with the highest `totalMs` - these are costing the most total time.

## Step 4 - Extract Query Filters for Index Design

For the top offending collection, find what fields are being filtered:

```javascript
db.system.profile.find(
  { ns: "mydb.orders", planSummary: "COLLSCAN" },
  { "command.filter": 1, millis: 1 }
).sort({ millis: -1 }).limit(10);
```

Sample results:

```javascript
{ "command": { "filter": { "status": "pending", "userId": "u-42" } }, "millis": 430 }
{ "command": { "filter": { "status": "shipped", "userId": "u-19" } }, "millis": 415 }
{ "command": { "filter": { "userId": "u-87" } }, "millis": 380 }
```

Both `status` and `userId` appear frequently - create a compound index:

```javascript
db.orders.createIndex({ userId: 1, status: 1 });
```

## Step 5 - Verify the Fix with explain()

Before and after creating the index, compare explain output:

```javascript
// Before
db.orders.find({ userId: "u-42", status: "pending" }).explain("executionStats");
// totalDocsExamined: 85000, stage: COLLSCAN

// After creating index
db.orders.find({ userId: "u-42", status: "pending" }).explain("executionStats");
// totalDocsExamined: 12, stage: IXSCAN
```

## Step 6 - Check for Near-Miss Indexes (Partial IXSCAN)

Sometimes an index exists but doesn't fully cover the query, causing high `keysExamined`:

```javascript
db.system.profile.find(
  {
    planSummary: { $regex: /IXSCAN/ },
    $expr: { $gt: [{ $divide: ["$keysExamined", { $max: ["$nreturned", 1] }] }, 50] }
  },
  { ns: 1, "command.filter": 1, keysExamined: 1, nreturned: 1, planSummary: 1 }
).sort({ keysExamined: -1 }).limit(10);
```

High `keysExamined / nReturned` with an IXSCAN means you need a more selective or compound index.

## Using Atlas Performance Advisor

On MongoDB Atlas, the Performance Advisor automatically surfaces index recommendations:

```text
Performance Advisor -> Suggested Indexes
  Index on orders: { userId: 1, status: 1 }
  Impact: reduces 1,247 slow queries/hour
  Average improvement: 97% reduction in execution time
```

## Step 7 - Create and Monitor

```javascript
// In MongoDB 4.2+, index builds are optimized automatically (background option is ignored)
db.orders.createIndex(
  { userId: 1, status: 1 },
  { name: "idx_userId_status" }
);

// Verify after creation
db.orders.getIndexes();
```

Re-run the profiler analysis after 30 minutes to confirm the COLLSCAN patterns disappear.

## Summary

Identify missing indexes by querying `system.profile` for COLLSCAN operations, grouping by namespace to find the highest-cost collections, and extracting filter fields to design targeted compound indexes. Verify improvements with `explain("executionStats")` before and after index creation. On Atlas, use Performance Advisor for automated recommendations. The goal is to reduce `docsExamined / nReturned` ratios to near 1.0 for all frequent query patterns.
