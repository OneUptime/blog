# How to Identify IXSCAN vs COLLSCAN in MongoDB Explain Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Explain Plan, Index Scan, Collection Scan, Query Optimization

Description: Learn how to read MongoDB explain plans to identify IXSCAN and COLLSCAN stages, understand their performance implications, and fix collection scans.

---

The difference between an IXSCAN (index scan) and a COLLSCAN (collection scan) in MongoDB's explain plan output is one of the most important performance signals you can read. An IXSCAN uses an index to locate matching documents efficiently; a COLLSCAN reads every document in the collection.

## Running explain()

MongoDB's `explain()` method runs the query and returns the execution plan. Use `"executionStats"` verbosity for full details:

```javascript
db.orders.find({ status: "pending", userId: "usr_123" }).explain("executionStats");
```

## Reading a COLLSCAN Plan

A collection scan looks like this in the explain output:

```json
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "COLLSCAN",
      "filter": {
        "status": { "$eq": "pending" }
      },
      "direction": "forward"
    }
  },
  "executionStats": {
    "nReturned": 42,
    "totalDocsExamined": 1250000,
    "totalKeysExamined": 0,
    "executionTimeMillis": 1840
  }
}
```

Key signals:
- `"stage": "COLLSCAN"` - every document was read
- `totalDocsExamined: 1250000` - scanned 1.25M docs to return 42
- `totalKeysExamined: 0` - no index was used
- High `executionTimeMillis` - slow query

## Reading an IXSCAN Plan

After adding an index, the same query produces:

```json
{
  "queryPlanner": {
    "winningPlan": {
      "stage": "FETCH",
      "inputStage": {
        "stage": "IXSCAN",
        "indexName": "status_1_userId_1",
        "direction": "forward",
        "indexBounds": {
          "status": ["[\"pending\", \"pending\"]"],
          "userId": ["[\"usr_123\", \"usr_123\"]"]
        }
      }
    }
  },
  "executionStats": {
    "nReturned": 42,
    "totalDocsExamined": 42,
    "totalKeysExamined": 42,
    "executionTimeMillis": 2
  }
}
```

Key signals:
- `"stage": "IXSCAN"` - index was used
- `totalDocsExamined: 42` = `nReturned: 42` - no wasted reads
- `indexName: "status_1_userId_1"` - tells you which index was chosen
- `executionTimeMillis: 2` - 920x faster

## Creating the Index to Fix a COLLSCAN

Match the index fields to your query filter fields:

```javascript
// For the query: find({ status: "pending", userId: "usr_123" })
db.orders.createIndex({ status: 1, userId: 1 });
```

## IXSCAN Without FETCH: Covered Queries

The most efficient plan has IXSCAN with no FETCH stage. This happens when the projection only includes indexed fields:

```javascript
db.orders.find(
  { status: "pending" },
  { status: 1, userId: 1, _id: 0 }
).explain("executionStats");

// Plan shows:
// "stage": "PROJECTION_COVERED"
//   "inputStage": { "stage": "IXSCAN" }
// No FETCH stage - data comes entirely from the index
```

## COLLSCAN Is Acceptable in These Cases

Not every COLLSCAN is a problem:

```javascript
// Small collection - COLLSCAN is fine
db.config_items.find({ type: "feature_flag" });
// If collection has 50 documents, a scan is fast and an index adds overhead

// One-time administrative query - acceptable
db.users.find({ "legacyField": { $exists: true } });
```

## Using the Profiler to Find COLLSCAN Queries in Production

```javascript
// Enable slow query logging
db.setProfilingLevel(1, { slowms: 100 });

// Find queries that used COLLSCAN
db.system.profile.find(
  { planSummary: /COLLSCAN/ },
  { ns: 1, command: 1, millis: 1, planSummary: 1 }
).sort({ millis: -1 }).limit(10);
```

## Summary

IXSCAN in MongoDB explain plans means an index is being used - documents are located through the index rather than by scanning the collection. COLLSCAN means every document was read. When `totalDocsExamined` far exceeds `nReturned`, a COLLSCAN is wasting resources. Create appropriate indexes to convert COLLSCAN plans to IXSCAN, and aim for covered queries (IXSCAN without FETCH) for maximum performance on hot query paths.
