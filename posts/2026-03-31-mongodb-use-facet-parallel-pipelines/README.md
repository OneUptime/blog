# How to Use $facet to Run Multiple Aggregation Pipelines in Parallel in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, Pipeline Stage, Faceted Search

Description: Learn how MongoDB's $facet stage runs multiple sub-pipelines on the same input documents simultaneously, returning all results in a single aggregation response.

---

## What Is the $facet Stage?

The `$facet` stage processes multiple aggregation sub-pipelines on the same set of input documents in a single pipeline pass. Each sub-pipeline runs independently and produces its own output array. All sub-pipeline results are returned together in a single document, making `$facet` the key tool for faceted search, paginated results with totals, and multi-dimensional analytics.

## Basic Syntax

```javascript
db.collection.aggregate([
  {
    $facet: {
      <pipelineName1>: [<stage1>, <stage2>, ...],
      <pipelineName2>: [<stage1>, <stage2>, ...],
      ...
    }
  }
])
```

The output is a single document where each key corresponds to a sub-pipeline and its value is the array of results.

## Example: Paginated Results with Total Count

```javascript
db.products.aggregate([
  { $match: { category: "electronics" } },
  {
    $facet: {
      results: [
        { $sort: { price: 1 } },
        { $skip: 0 },
        { $limit: 20 }
      ],
      totalCount: [
        { $count: "count" }
      ]
    }
  }
])
// Output:
// {
//   results: [...20 products...],
//   totalCount: [{ count: 342 }]
// }
```

## Example: Faceted Search (E-commerce Filters)

```javascript
db.products.aggregate([
  { $match: { $text: { $search: "wireless headphones" } } },
  {
    $facet: {
      byBrand: [
        { $sortByCount: "$brand" }
      ],
      byPriceRange: [
        {
          $bucket: {
            groupBy: "$price",
            boundaries: [0, 50, 100, 200, 500],
            default: "500+"
          }
        }
      ],
      byRating: [
        {
          $bucket: {
            groupBy: "$rating",
            boundaries: [1, 2, 3, 4, 5],
            default: "Unrated"
          }
        }
      ],
      results: [
        { $sort: { score: { $meta: "textScore" } } },
        { $limit: 20 },
        { $project: { name: 1, price: 1, brand: 1, rating: 1 } }
      ]
    }
  }
])
```

This single query returns search results plus all filter facets in one round trip.

## Multi-Dimensional Analytics

```javascript
db.orders.aggregate([
  { $match: { year: 2024 } },
  {
    $facet: {
      byMonth: [
        {
          $group: {
            _id: { $month: "$createdAt" },
            revenue: { $sum: "$amount" }
          }
        },
        { $sort: { _id: 1 } }
      ],
      byRegion: [
        {
          $group: {
            _id: "$region",
            revenue: { $sum: "$amount" },
            orderCount: { $sum: 1 }
          }
        }
      ],
      topProducts: [
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            sold: { $sum: "$items.quantity" }
          }
        },
        { $sort: { sold: -1 } },
        { $limit: 10 }
      ]
    }
  }
])
```

## Extracting Results from $facet Output

The output of `$facet` is always a single document with arrays. Use `$addFields` or application code to extract the total count.

```javascript
db.products.aggregate([
  { $match: { category: "electronics" } },
  {
    $facet: {
      data: [{ $limit: 10 }],
      total: [{ $count: "n" }]
    }
  },
  {
    $addFields: {
      total: { $arrayElemAt: ["$total.n", 0] }
    }
  }
])
```

## Limitations

- Sub-pipelines within `$facet` cannot include `$collStats`, `$facet`, `$geoNear`, `$indexStats`, `$out`, `$merge`, or `$planCacheStats`
- Memory limit per facet pipeline is 100 MB (use `allowDiskUse` for larger datasets)

## Summary

The `$facet` stage is the most efficient way to compute multiple views of the same dataset in a single MongoDB aggregation. It eliminates the need for multiple round-trip queries when building search UIs, dashboards, or analytics pages that need counts, facets, and paginated data simultaneously.
