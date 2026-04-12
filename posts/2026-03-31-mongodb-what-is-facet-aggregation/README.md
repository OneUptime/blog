# What Is $facet and When to Use It in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Facet, Aggregation, Search, Analytics

Description: The $facet stage in MongoDB runs multiple aggregation sub-pipelines on the same input documents in a single pass, ideal for faceted search and multi-dimensional analytics.

---

## Overview

`$facet` is a MongoDB aggregation stage that allows you to run multiple independent sub-pipelines on the same set of input documents simultaneously. Each sub-pipeline produces its own output array under a named field. The key benefit is efficiency: the input documents are processed only once, even though you are computing multiple different aggregations in parallel.

This makes `$facet` the natural choice for faceted search (e-commerce category filters, tag counts, price range breakdowns) and dashboards that need several metrics computed together.

## Syntax

```javascript
{
  $facet: {
    <facetName1>: [ <stage1>, <stage2>, ... ],
    <facetName2>: [ <stage1>, <stage2>, ... ],
    ...
  }
}
```

## Example: E-Commerce Faceted Search

Given a `products` collection, compute category counts, brand counts, and a price histogram in a single aggregation:

```javascript
db.products.aggregate([
  // First filter the base dataset
  { $match: { inStock: true, price: { $lte: 500 } } },

  // Run multiple facets on the filtered results
  {
    $facet: {
      categories: [
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ],
      brands: [
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ],
      priceRanges: [
        {
          $bucket: {
            groupBy: "$price",
            boundaries: [0, 50, 100, 200, 500],
            default: "500+",
            output: { count: { $sum: 1 } }
          }
        }
      ],
      totalCount: [
        { $count: "total" }
      ]
    }
  }
])
```

The result is a single document:

```json
{
  "categories": [{ "_id": "Electronics", "count": 45 }, ...],
  "brands": [{ "_id": "Sony", "count": 12 }, ...],
  "priceRanges": [{ "_id": 0, "count": 8 }, ...],
  "totalCount": [{ "total": 142 }]
}
```

## Example: Analytics Dashboard

Compute multiple metrics for a reporting dashboard in one query:

```javascript
db.orders.aggregate([
  { $match: { createdAt: { $gte: new Date("2026-01-01") } } },
  {
    $facet: {
      totalRevenue: [
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ],
      ordersByStatus: [
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ],
      topProducts: [
        { $unwind: "$items" },
        { $group: { _id: "$items.productId", qty: { $sum: "$items.qty" } } },
        { $sort: { qty: -1 } },
        { $limit: 5 }
      ]
    }
  }
])
```

## Important Characteristics

- Each sub-pipeline inside `$facet` starts from the same input documents. Stages in one sub-pipeline do not affect others.
- `$facet` cannot contain `$facet`, `$out`, `$merge`, `$geoNear`, `$collStats`, `$indexStats`, or `$planCacheStats` stages inside its sub-pipelines.
- The output of `$facet` is always a single document containing an array for each facet.
- Memory limits apply: by default, each pipeline stage can use up to 100 MB of RAM. Use `allowDiskUse: true` for large datasets.

## $facet vs. Multiple Queries

Without `$facet`, you would run three separate queries for categories, brands, and price ranges. With `$facet`, you scan the filtered documents once and branch into multiple aggregations. This reduces both latency and server load.

## Summary

`$facet` enables multi-dimensional aggregation in a single pipeline pass by branching into independent sub-pipelines. It is the standard building block for faceted search UIs and analytics dashboards where multiple metrics must be computed from the same base dataset efficiently.
