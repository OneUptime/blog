# How to Output Aggregation Results to a New Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Collection, Pipeline, Database

Description: Learn how to use the $out and $merge stages to write MongoDB aggregation pipeline results directly into a new or existing collection.

---

## Overview

MongoDB aggregation pipelines process data and return results, but sometimes you want to persist those results for later use. The `$out` and `$merge` stages let you write pipeline output directly to a collection, enabling materialized views, reporting tables, and ETL workflows.

## Using $out to Write Results to a New Collection

The `$out` stage writes all documents to a specified collection, replacing it entirely if it exists.

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
      _id: "$customerId",
      totalSpent: { $sum: "$amount" },
      orderCount: { $sum: 1 }
  }},
  { $out: "customer_summaries" }
])
```

After the pipeline runs, `customer_summaries` contains the grouped results. If the collection existed before, it is completely replaced.

## Using $merge for Incremental Updates

Unlike `$out`, the `$merge` stage can insert, update, or merge results into an existing collection without replacing it.

```javascript
db.orders.aggregate([
  { $match: {
      createdAt: { $gte: ISODate("2024-01-01") }
  }},
  { $group: {
      _id: "$region",
      revenue: { $sum: "$amount" }
  }},
  { $merge: {
      into: "regional_revenue",
      on: "_id",
      whenMatched: "merge",
      whenNotMatched: "insert"
  }}
])
```

The `whenMatched: "merge"` option updates existing documents, while `whenNotMatched: "insert"` adds new ones.

## Writing to a Collection in Another Database

Both stages support writing to a different database:

```javascript
db.events.aggregate([
  { $group: {
      _id: { year: { $year: "$ts" }, month: { $month: "$ts" } },
      count: { $sum: 1 }
  }},
  { $out: { db: "reporting", coll: "event_monthly_counts" } }
])
```

## Scheduling Refreshes with a Script

For reporting tables that need periodic updates, wrap the aggregation in a script and schedule it with cron:

```bash
#!/bin/bash
mongosh "mongodb://localhost:27017/mydb" --eval '
db.orders.aggregate([
  { $group: { _id: "$productId", total: { $sum: "$qty" } } },
  { $out: "product_sales_summary" }
]);
print("Aggregation complete");
'
```

```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/refresh_summaries.sh >> /var/log/mongo_agg.log 2>&1
```

## When to Use $out vs $merge

Use `$out` when you want a full replacement of the target collection on each run - ideal for daily snapshots. Use `$merge` when you want incremental updates or need to preserve documents not touched by the current pipeline run.

## Index Considerations

When `$out` replaces an existing collection, it atomically copies the indexes from the previous collection to the new one, so existing indexes are preserved. However, if the target collection does not yet exist, you need to create indexes after the first pipeline run:

```javascript
db.customer_summaries.createIndex({ totalSpent: -1 })
db.customer_summaries.createIndex({ orderCount: -1 })
```

With `$merge`, existing indexes on the target collection are also preserved.

## Summary

The `$out` and `$merge` aggregation stages in MongoDB allow you to persist pipeline results directly into collections, enabling materialized views and ETL workflows. Use `$out` for full replacements and `$merge` for incremental upserts. Both stages preserve existing indexes on the target collection.
