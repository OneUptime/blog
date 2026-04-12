# How to Respond to MongoDB Slow Query Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Performance, Alert, Query, Index

Description: Learn how to diagnose and resolve MongoDB slow query alerts using the profiler, explain plans, and index optimizations to eliminate full collection scans.

---

## What Triggers Slow Query Alerts

MongoDB logs queries that exceed the `slowms` threshold (default: 100ms) to the system log and the database profiler. Atlas Performance Advisor and slow query alerts monitor these logs. Common causes include missing indexes, query patterns that cannot use existing indexes, and in-memory sorts on large result sets.

## Step 1: Find Slow Queries

### Using Atlas Performance Advisor

The Atlas UI's Performance Advisor tab automatically suggests indexes for slow queries. It shows the query shape, execution count, and avg execution time.

### Using the Database Profiler

Enable the profiler on level 2 to capture all queries:

```javascript
db.setProfilingLevel(2, { slowms: 100 });
```

Query the profile collection to find the slowest operations:

```javascript
db.system.profile.find(
  { ns: "mydb.orders", millis: { $gt: 200 } }
).sort({ millis: -1 }).limit(10).project({
  op: 1, ns: 1, millis: 1, command: 1, keysExamined: 1, docsExamined: 1
});
```

Watch the ratio of `docsExamined` to `nreturned` - a ratio greater than 10:1 suggests a missing or inefficient index.

## Step 2: Analyze the Explain Plan

Run `explain` on the slow query:

```javascript
db.orders.explain("executionStats").find(
  { customerId: ObjectId("..."), status: "pending" }
).sort({ createdAt: -1 });
```

Look for these winning plan stages:

```text
COLLSCAN         -> full collection scan, needs index
IXSCAN           -> index scan (good)
FETCH            -> loading full documents after index scan
SORT             -> in-memory sort (needs index to cover sort)
```

If you see `COLLSCAN`, you need an index. If you see `SORT`, your index should include the sort field.

## Step 3: Create the Right Index

For the query above:

```javascript
db.orders.createIndex({ customerId: 1, status: 1, createdAt: -1 });
```

The ESR rule (Equality, Sort, Range): put equality fields first, then sort fields, then range fields.

## Step 4: Fix Common Slow Query Patterns

### Avoid regex without anchoring

```javascript
// Slow: regex scan
db.products.find({ name: /laptop/ });

// Better: anchored prefix - can use index
db.products.find({ name: /^laptop/ });

// Best: use Atlas Search for full-text
```

### Avoid negation operators on unindexed fields

```javascript
// Slow: $ne often leads to inefficient index usage or a full collection scan
db.orders.find({ status: { $ne: "cancelled" } });

// Better: query for the states you DO want
db.orders.find({ status: { $in: ["pending", "paid", "shipped"] } });
```

### Avoid `$where` and JavaScript expressions

```javascript
// Very slow: runs JavaScript per document
db.orders.find({ $where: "this.total > 100" });

// Fast: native operators
db.orders.find({ total: { $gt: 100 } });
```

## Step 5: Tune slowms and Alerts

```javascript
// Lower threshold to catch more queries
db.setProfilingLevel(1, { slowms: 50 });
```

On Atlas:

```bash
atlas alerts settings create \
  --event QUERY_TARGETING_SCANNED_OBJECTS_PER_RETURNED \
  --metricThreshold 1000 \
  --notificationType EMAIL \
  --notificationEmailAddress ops@example.com
```

## Summary

Responding to slow query alerts in MongoDB starts with the Atlas Performance Advisor or the database profiler to identify the query shapes. Running `explain("executionStats")` reveals whether the query uses an index or performs a full scan. Fix the most common issues by creating compound indexes following the ESR rule, avoiding unanchored regex on large collections, replacing `$ne` with `$in` for indexed fields, and never using `$where` for performance-sensitive queries.
