# How to Build an Analytics Dashboard with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Analytics, Dashboard, Pipeline

Description: Learn how to build a real-time analytics dashboard using MongoDB aggregation pipelines to compute metrics, trends, and summaries from raw event data.

---

Analytics dashboards require fast aggregation of large datasets. MongoDB's aggregation pipeline is purpose-built for this use case, letting you compute metrics directly in the database rather than pulling raw data into application memory.

## Designing the Events Collection

Start with a collection that captures discrete events. Each document should carry a timestamp, an event type, and any relevant metadata.

```javascript
db.events.insertMany([
  {
    type: "page_view",
    userId: "u1",
    page: "/pricing",
    duration: 45,
    ts: new Date("2026-03-31T10:00:00Z")
  },
  {
    type: "signup",
    userId: "u2",
    plan: "pro",
    ts: new Date("2026-03-31T10:05:00Z")
  }
]);
```

## Indexing for Dashboard Queries

Dashboard queries almost always filter by time and group by type or user. Create a compound index on `ts` and `type` to support these patterns efficiently.

```javascript
db.events.createIndex({ ts: -1, type: 1 });
```

## Aggregating Hourly Event Counts

Use `$dateToString` with `$group` to bucket events by hour. This produces the time-series data needed for line charts.

```javascript
db.events.aggregate([
  {
    $match: {
      ts: {
        $gte: new Date("2026-03-31T00:00:00Z"),
        $lt: new Date("2026-04-01T00:00:00Z")
      }
    }
  },
  {
    $group: {
      _id: {
        hour: { $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$ts" } },
        type: "$type"
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.hour": 1 } }
]);
```

## Computing Conversion Rates

Combine multiple `$group` stages to compare funnel steps. The following pipeline gathers the counts of signups and page views so you can compute the conversion rate in your application.

```javascript
db.events.aggregate([
  {
    $match: {
      type: { $in: ["page_view", "signup"] },
      ts: { $gte: new Date("2026-03-31T00:00:00Z") }
    }
  },
  {
    $group: {
      _id: "$type",
      total: { $sum: 1 }
    }
  },
  {
    $group: {
      _id: null,
      metrics: { $push: { type: "$_id", total: "$total" } }
    }
  }
]);
```

## Caching Dashboard Results

Dashboard data does not need to be real-time to the second. Cache aggregation results in a separate `dashboard_snapshots` collection with a TTL index.

```javascript
db.dashboard_snapshots.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 300 }
);

db.dashboard_snapshots.insertOne({
  name: "hourly_events",
  data: aggregatedResults,
  createdAt: new Date()
});
```

The application checks the snapshot first and only re-runs the aggregation pipeline when the cached document has expired.

## Projecting Summary Cards

Top-level KPI cards require simple `$group` totals. Use `$facet` to run multiple aggregations in a single pass.

```javascript
db.events.aggregate([
  { $match: { ts: { $gte: new Date("2026-03-31T00:00:00Z") } } },
  {
    $facet: {
      totalEvents: [{ $count: "count" }],
      uniqueUsers: [{ $group: { _id: "$userId" } }, { $count: "count" }],
      byType: [{ $group: { _id: "$type", count: { $sum: 1 } } }]
    }
  }
]);
```

`$facet` eliminates the need for multiple round trips and makes the dashboard API simpler to implement.

## Summary

Building an analytics dashboard with MongoDB centers on three techniques: designing a flat events schema with good indexes, using the aggregation pipeline with `$group`, `$dateToString`, and `$facet` to compute metrics in the database, and caching results with TTL indexes to avoid redundant work. This approach scales well because MongoDB processes aggregations close to the data, and partial results can be materialized progressively as data volumes grow.
