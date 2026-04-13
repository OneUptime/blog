# How to Detect Collection Scan Hotspots with the MongoDB Profiler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Profiler, Collection Scan, Query Optimization, Performance

Description: Detect collection scan hotspots in MongoDB using profiler aggregations, identify repeat offenders by collection and query shape, and prioritize index creation for maximum impact.

---

A collection scan hotspot is a collection or query pattern that repeatedly triggers full scans, consuming disproportionate CPU and I/O. Detecting them systematically from profiler data helps you focus index creation effort where it will have the most impact.

## What Is a Collection Scan Hotspot?

A hotspot is not just a single slow query - it is a pattern that fires frequently, repeatedly scanning a collection. A query that takes 400 ms but runs 10,000 times per hour is far more damaging than a 2-second query that runs once a day.

## Step 1 - Enable Profiling

```javascript
db.setProfilingLevel(1, { slowms: 50, sampleRate: 0.2 });
```

Use a 50 ms threshold and 20% sample rate to capture enough COLLSCAN events without overwhelming `system.profile`.

## Step 2 - Identify High-Frequency COLLSCANs

Group by namespace and sort by occurrence count:

```javascript
db.system.profile.aggregate([
  { $match: { planSummary: "COLLSCAN", millis: { $gt: 20 } } },
  {
    $group: {
      _id: "$ns",
      count:     { $sum: 1 },
      totalMs:   { $sum: "$millis" },
      avgMs:     { $avg: "$millis" },
      maxMs:     { $max: "$millis" },
      totalDocs: { $sum: "$docsExamined" }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

The collection with the highest `count` is your top hotspot even if `avgMs` is moderate.

## Step 3 - Drill Into Query Shapes for That Collection

```javascript
db.system.profile.aggregate([
  { $match: { ns: "mydb.events", planSummary: "COLLSCAN" } },
  {
    $group: {
      _id: {
        filter: "$command.filter",
        sort: "$command.sort"
      },
      occurrences: { $sum: 1 },
      totalMs:     { $sum: "$millis" },
      avgDocs:     { $avg: "$docsExamined" }
    }
  },
  { $sort: { occurrences: -1 } },
  { $limit: 10 }
]);
```

This groups by the exact filter + sort combination, revealing the distinct query patterns causing the hotspot.

## Step 4 - Compute Total Database Time Wasted

Calculate how much cumulative time COLLSCANs are consuming:

```javascript
db.system.profile.aggregate([
  { $match: { planSummary: "COLLSCAN" } },
  {
    $group: {
      _id: null,
      totalMs:      { $sum: "$millis" },
      totalDocs:    { $sum: "$docsExamined" },
      avgMs:        { $avg: "$millis" },
      operations:   { $sum: 1 }
    }
  }
]);
```

If this shows 500,000 ms of COLLSCAN time in the last hour, that is 500 seconds of wasted database time per hour across all queries.

## Step 5 - Build the Right Index

For the most common COLLSCAN pattern, extract fields and create the index:

```javascript
// Hotspot query shape: { type: "click", userId: "u-42" }, sort: { timestamp: -1 }
db.events.createIndex(
  { type: 1, userId: 1, timestamp: -1 },
  { name: "idx_type_userId_ts" }
);
```

## Step 6 - Validate the Fix

After creating the index, wait 15-30 minutes and re-run the aggregation:

```javascript
db.system.profile.aggregate([
  { $match: { ns: "mydb.events", millis: { $gt: 20 } } },
  {
    $group: {
      _id: "$planSummary",
      count: { $sum: 1 },
      avgMs: { $avg: "$millis" }
    }
  }
]);
```

You should see COLLSCAN counts drop significantly and IXSCAN count increase.

## Automating Hotspot Detection

Run this check on a schedule (e.g., hourly via a cron job):

```javascript
function reportCollscanHotspots() {
  const hotspots = db.system.profile.aggregate([
    { $match: { planSummary: "COLLSCAN", millis: { $gt: 50 } } },
    {
      $group: {
        _id: "$ns",
        count:   { $sum: 1 },
        totalMs: { $sum: "$millis" }
      }
    },
    { $match: { count: { $gt: 10 } } },
    { $sort: { totalMs: -1 } }
  ]).toArray();

  hotspots.forEach(h => {
    print(`HOTSPOT: ${h._id} | ${h.count} scans | ${h.totalMs}ms total`);
  });
}

reportCollscanHotspots();
```

## Summary

Collection scan hotspots are identified by grouping `system.profile` COLLSCAN entries by namespace and occurrence count, not just by execution time. The highest-frequency hotspots often cause more overall damage than occasional slow queries. For each hotspot, extract the query filter and sort fields to design a targeted compound index. Validate fixes by re-running the aggregation and confirming COLLSCAN counts drop. Automate the detection script to run hourly so new hotspots are caught quickly.
