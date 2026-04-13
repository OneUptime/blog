# How to Build Faceted Navigation with $searchMeta in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Faceted Search, Navigation

Description: Learn how to build faceted navigation in MongoDB Atlas Search using the $searchMeta aggregation stage to return facet counts for categories, price ranges, and filters.

---

## Overview

Faceted navigation is the filtering sidebar found in e-commerce and search interfaces that shows the count of results for each filter option (e.g., "Brand: Sony (42), Samsung (38), Apple (19)"). MongoDB Atlas Search's `$searchMeta` aggregation stage returns facet counts alongside search results, enabling this pattern efficiently in a single database query.

## Prerequisites

Create an Atlas Search index with facet fields configured:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "brand": [
        { "type": "stringFacet" },
        { "type": "string", "analyzer": "lucene.keyword" }
      ],
      "category": {
        "type": "stringFacet"
      },
      "price": {
        "type": "numberFacet"
      },
      "rating": {
        "type": "numberFacet"
      },
      "inStock": {
        "type": "boolean"
      }
    }
  }
}
```

Fields used as facets must be indexed as `stringFacet` or `numberFacet`. If you also need to filter a facet field using the `text` operator (e.g., in a `compound` query), you must add a `string` type mapping alongside `stringFacet` — the `stringFacet` type only supports facet operations and silently returns empty results if queried with `text`.

## Basic Facet Query with $searchMeta

```javascript
db.products.aggregate([
  {
    $searchMeta: {
      index: "default",
      facet: {
        operator: {
          text: {
            query: "headphones",
            path: "title"
          }
        },
        facets: {
          brandFacet: {
            type: "string",
            path: "brand",
            numBuckets: 10  // return top 10 brands
          },
          categoryFacet: {
            type: "string",
            path: "category",
            numBuckets: 5
          },
          priceFacet: {
            type: "number",
            path: "price",
            boundaries: [0, 50, 100, 200, 500, 1000],
            default: "1000+"
          }
        }
      }
    }
  }
])
```

Returns:

```javascript
{
  count: { lowerBound: 156 },
  facet: {
    brandFacet: {
      buckets: [
        { _id: "Sony", count: 42 },
        { _id: "Bose", count: 38 },
        { _id: "JBL", count: 27 },
        { _id: "Samsung", count: 19 }
      ]
    },
    priceFacet: {
      buckets: [
        { _id: 0, count: 12 },
        { _id: 50, count: 45 },
        { _id: 100, count: 61 },
        { _id: 200, count: 28 },
        { _id: 500, count: 8 },
        { _id: "1000+", count: 2 }
      ]
    }
  }
}
```

## Getting Both Results and Facets in One Query

Use `$facet` in the aggregation pipeline to get search results and facet counts together:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      compound: {
        must: [
          {
            text: {
              query: "headphones",
              path: "title"
            }
          }
        ],
        filter: [
          {
            equals: {
              path: "inStock",
              value: true
            }
          }
        ]
      }
    }
  },
  {
    $facet: {
      // Search results
      results: [
        { $skip: 0 },
        { $limit: 12 },
        { $project: { title: 1, brand: 1, price: 1, rating: 1 } }
      ],
      // Total count
      totalCount: [
        { $count: "count" }
      ]
    }
  }
])
```

For facets alongside results, combine `$searchMeta` for facet data with `$search` for results:

```javascript
// Two separate queries (or use $unionWith)

// Query 1: Get search results
let results = await db.products.aggregate([
  {
    $search: {
      text: { query: userQuery, path: "title" }
    }
  },
  { $skip: (page - 1) * 12 },
  { $limit: 12 },
  { $project: { title: 1, price: 1, brand: 1 } }
]).toArray();

// Query 2: Get facet counts for the same query
let facets = await db.products.aggregate([
  {
    $searchMeta: {
      facet: {
        operator: {
          text: { query: userQuery, path: "title" }
        },
        facets: {
          brands: { type: "string", path: "brand", numBuckets: 10 },
          prices: {
            type: "number",
            path: "price",
            boundaries: [0, 100, 300, 600, 1000]
          }
        }
      }
    }
  }
]).toArray();
```

## Filtering with Active Facets

When a user selects a facet (e.g., "Brand: Sony"), apply it as a filter while keeping the facet counts:

```javascript
// User has selected brand = "Sony" and price range 100-300
db.products.aggregate([
  {
    $searchMeta: {
      facet: {
        operator: {
          compound: {
            must: [
              {
                text: {
                  query: "headphones",
                  path: "title"
                }
              }
            ],
            filter: [
              // Active facet filter
              {
                text: {
                  query: "Sony",
                  path: "brand"
                }
              },
              // Active price range filter
              {
                range: {
                  path: "price",
                  gte: 100,
                  lte: 300
                }
              }
            ]
          }
        },
        facets: {
          brandFacet: {
            type: "string",
            path: "brand",
            numBuckets: 10
          },
          priceFacet: {
            type: "number",
            path: "price",
            boundaries: [0, 100, 300, 600, 1000],
            default: "1000+"
          }
        }
      }
    }
  }
])
```

## Building a Faceted Search API

```javascript
// Express.js route for faceted search
app.get('/api/search', async (req, res) => {
  const { q = '', brand, minPrice, maxPrice, page = 1 } = req.query;
  const pageSize = 12;
  
  // Build filter conditions
  let filters = [];
  if (brand) {
    filters.push({ text: { query: brand, path: "brand" } });
  }
  if (minPrice || maxPrice) {
    let range = { path: "price" };
    if (minPrice) range.gte = parseFloat(minPrice);
    if (maxPrice) range.lte = parseFloat(maxPrice);
    filters.push({ range });
  }
  
  let searchOp = {
    compound: {
      must: q ? [{ text: { query: q, path: ["title", "description"] } }] : [],
      filter: filters
    }
  };
  
  // Get facets
  let facetResults = await db.collection('products').aggregate([
    {
      $searchMeta: {
        facet: {
          operator: searchOp,
          facets: {
            brands: { type: "string", path: "brand", numBuckets: 10 },
            prices: { type: "number", path: "price", boundaries: [0, 100, 300, 600, 1000], default: "1000+" }
          }
        }
      }
    }
  ]).toArray();
  
  res.json({
    facets: facetResults[0]?.facet || {},
    totalCount: facetResults[0]?.count?.lowerBound || 0
  });
});
```

## Summary

`$searchMeta` with the `facet` operator returns category counts and range distributions for search results, enabling faceted navigation sidebars in a single query. Fields must be indexed as `stringFacet` or `numberFacet` types in the Atlas Search index. Combine `$searchMeta` for facet data with `$search` for paginated results, and apply active facet selections as `filter` clauses in the `compound` operator to progressively narrow results while keeping facet counts accurate.
