# How to Implement Faceted Product Search with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Search, Aggregation, Atlas Search, Index

Description: Learn how to implement faceted product search in MongoDB using the aggregation pipeline and Atlas Search facets to filter by category, price, and attributes.

---

## What Is Faceted Search?

Faceted search lets shoppers narrow results by multiple dimensions simultaneously - brand, price range, color, size, rating - while seeing a count for each option. Implementing this in MongoDB requires either a well-designed aggregation pipeline or the `$searchMeta` stage in Atlas Search.

## Sample Product Schema

```javascript
{
  _id: ObjectId("..."),
  name: "Running Shoes X200",
  brand: "Stride",
  category: "footwear",
  price: 89.99,
  attributes: {
    color: "blue",
    size: 10,
    gender: "men"
  },
  avgRating: 4.3,
  inStock: true
}
```

## Faceted Aggregation with the Standard Pipeline

For self-hosted MongoDB or Atlas without full-text, use `$facet` to compute multiple aggregations in a single pass:

```javascript
db.products.aggregate([
  // Apply active filters from user
  { $match: { category: "footwear", inStock: true, price: { $lte: 150 } } },

  { $facet: {
    results: [
      { $sort: { avgRating: -1 } },
      { $skip: 0 },
      { $limit: 20 }
    ],
    brandFacet: [
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ],
    priceFacet: [
      { $bucket: {
          groupBy: "$price",
          boundaries: [0, 25, 50, 100, 200, 500],
          default: "500+",
          output: { count: { $sum: 1 } }
      }}
    ],
    colorFacet: [
      { $group: { _id: "$attributes.color", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ],
    totalCount: [
      { $count: "n" }
    ]
  }}
]);
```

This returns paginated results, brand counts, price range buckets, and color counts in one round trip.

## Faceted Search with Atlas Search

Atlas Search provides the `$searchMeta` and `$search` stages with built-in facet support. First, create a search index with facet mappings:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name":     { "type": "string" },
      "brand":    [{ "type": "string" }, { "type": "stringFacet" }],
      "category": [{ "type": "string" }, { "type": "stringFacet" }],
      "price":    [{ "type": "number" }, { "type": "numberFacet" }],
      "inStock":  { "type": "boolean" }
    }
  }
}
```

Then query facets using `$searchMeta`:

```javascript
db.products.aggregate([
  { $searchMeta: {
    index: "product-search",
    facet: {
      operator: {
        compound: {
          filter: [
            { text: { query: "running", path: "name" } },
            { equals: { value: true, path: "inStock" } }
          ]
        }
      },
      facets: {
        brandFacet:    { type: "string",  path: "brand", numBuckets: 10 },
        categoryFacet: { type: "string",  path: "category" },
        priceFacet:    { type: "number",  path: "price",
                         boundaries: [0, 25, 50, 100, 200], default: "other" }
      }
    }
  }}
]);
```

## Indexes for Performance

For the standard aggregation approach, create indexes that support your most common filter combinations:

```javascript
db.products.createIndex({ category: 1, inStock: 1, price: 1, avgRating: -1 });
db.products.createIndex({ "attributes.color": 1, category: 1 });
```

## Handling Multi-Select Facets

When a user selects multiple brands, exclude the brand filter from the outer `$match` and apply it only inside the `results` sub-pipeline so all brand options remain visible in the facet counts:

```javascript
const brandFilter = selectedBrands.length
  ? { brand: { $in: selectedBrands } }
  : {};

db.products.aggregate([
  { $match: { category: "footwear" } }, // no brandFilter here
  { $facet: {
    results:     [{ $match: brandFilter }, { $limit: 20 }],
    brandFacet:  [
      { $group: { _id: "$brand", count: { $sum: 1 } } }
    ]
  }}
]);
```

## Summary

Faceted product search in MongoDB is achievable with the `$facet` aggregation stage for simple attribute filtering or Atlas Search facets when full-text capabilities are needed. The key is combining a `$match` stage for active filters with parallel sub-pipelines that compute counts per facet dimension. Proper compound indexes keep these queries fast, and multi-select logic requires careful exclusion of the active filter when computing facet counts.
