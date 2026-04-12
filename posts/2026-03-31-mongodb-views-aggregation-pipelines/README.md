# How to Create Views with Aggregation Pipelines in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, View, Aggregation, Pipeline, Database Design

Description: Learn how to define MongoDB views backed by multi-stage aggregation pipelines to pre-compose complex transformations that queries can consume as simple collections.

---

MongoDB views are defined by an aggregation pipeline. Most aggregation pipeline stages can be used in a view definition, with a few exceptions, giving you full data transformation power as a reusable, named query object.

## Basic View with Multiple Pipeline Stages

```javascript
db.createView("active_customer_stats", "orders", [
  // Stage 1: filter recent orders
  {
    $match: {
      createdAt: { $gte: ISODate("2025-01-01") },
      status: { $ne: "cancelled" }
    }
  },
  // Stage 2: group by customer
  {
    $group: {
      _id: "$customerId",
      orderCount: { $sum: 1 },
      totalSpend: { $sum: "$amount" },
      lastOrderDate: { $max: "$createdAt" }
    }
  },
  // Stage 3: reshape output
  {
    $project: {
      customerId: "$_id",
      orderCount: 1,
      totalSpend: 1,
      lastOrderDate: 1,
      _id: 0
    }
  }
])
```

Querying the view is straightforward:

```javascript
db.active_customer_stats.find({ totalSpend: { $gt: 1000 } })
  .sort({ totalSpend: -1 })
  .limit(20)
```

## View with $lookup (Join)

```javascript
db.createView("enriched_events", "events", [
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      eventType: 1,
      timestamp: 1,
      "user.email": 1,
      "user.plan": 1,
      metadata: 1
    }
  }
])
```

## View with $addFields for Computed Properties

```javascript
db.createView("orders_with_margin", "orders", [
  {
    $addFields: {
      margin: {
        $subtract: ["$salePrice", "$costPrice"]
      },
      marginPct: {
        $multiply: [
          { $divide: [{ $subtract: ["$salePrice", "$costPrice"] }, "$salePrice"] },
          100
        ]
      }
    }
  }
])
```

## Aggregating Over a View

You can run additional aggregation over a view - the pipeline composes:

```javascript
db.active_customer_stats.aggregate([
  { $match: { orderCount: { $gte: 5 } } },
  {
    $bucket: {
      groupBy: "$totalSpend",
      boundaries: [0, 100, 500, 1000, 5000],
      default: "5000+",
      output: { count: { $sum: 1 } }
    }
  }
])
```

## Pipeline Stage Restrictions in Views

Most stages are permitted, but these are not allowed in view definitions:

| Disallowed Stage | Reason                                              |
|------------------|-----------------------------------------------------|
| `$out`           | Writes to a collection - views are read-only        |
| `$merge`         | Writes to a collection - views are read-only        |
| `$indexStats`    | Returns index metadata, not document data           |
| `$collStats`     | Returns collection metadata                         |
| `$geoNear`       | Must be first stage in a query pipeline, not a view |

## Verifying View Pipeline

Inspect what pipeline a view was created with:

```javascript
db.getCollectionInfos({ name: "active_customer_stats" })
// Returns options.pipeline with the full definition
```

## Summary

MongoDB views accept the same aggregation pipeline stages as `aggregate()`, allowing multi-stage transformations including `$match`, `$group`, `$lookup`, `$project`, and `$addFields`. Define complex transformations once in a view and query them with simple `find` calls, or compose additional aggregations on top of the view.
