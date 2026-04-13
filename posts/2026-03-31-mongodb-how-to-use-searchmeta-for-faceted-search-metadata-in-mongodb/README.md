# How to Use $searchMeta for Faceted Search Metadata in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, $searchMeta, Faceted Search, Aggregation, NoSQL

Description: Learn how to use MongoDB Atlas's $searchMeta stage to retrieve facet counts and search metadata without returning full documents, ideal for building filter UI components.

---

## What Is the $searchMeta Stage?

The `$searchMeta` stage is an Atlas Search aggregation stage that returns only the search metadata (like facet counts and total result counts) without returning the actual matched documents. This makes it highly efficient for building filter panels and search result metadata in UI applications.

```javascript
{
  $searchMeta: {
    index: "indexName",
    facet: {
      operator: { /* search operator */ },
      facets: {
        facetName: {
          type: "string" | "number" | "date",
          path: "fieldPath",
          // ...options
        }
      }
    }
  }
}
```

## Prerequisites

- MongoDB Atlas cluster with an Atlas Search index.
- The facet fields must be mapped as `stringFacet`, `numberFacet`, or `dateFacet` in the index.

Atlas Search index definition:

```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "category": { "type": "stringFacet" },
      "brand":    { "type": "stringFacet" },
      "price":    { "type": "numberFacet" },
      "rating":   { "type": "numberFacet" },
      "name":     { "type": "string" }
    }
  }
}
```

## Basic Facet Count Query

Get category and brand counts for a search query:

```javascript
db.products.aggregate([
  {
    $searchMeta: {
      index: "products_search",
      facet: {
        operator: {
          text: { query: "laptop", path: "name" }
        },
        facets: {
          categoryFacet: {
            type: "string",
            path: "category"
          },
          brandFacet: {
            type: "string",
            path: "brand",
            numBuckets: 10
          }
        }
      }
    }
  }
])
```

Output:

```javascript
{
  count: { lowerBound: 152 },
  facet: {
    categoryFacet: {
      buckets: [
        { _id: "Gaming Laptops", count: 45 },
        { _id: "Business Laptops", count: 38 },
        { _id: "Ultrabooks", count: 29 }
      ]
    },
    brandFacet: {
      buckets: [
        { _id: "Dell", count: 52 },
        { _id: "HP", count: 48 },
        { _id: "Lenovo", count: 35 }
      ]
    }
  }
}
```

## Numeric Facets with Ranges

```javascript
db.products.aggregate([
  {
    $searchMeta: {
      facet: {
        operator: {
          text: { query: "wireless", path: "description" }
        },
        facets: {
          priceFacet: {
            type: "number",
            path: "price",
            boundaries: [0, 50, 100, 250, 500, 1000],
            default: "Other"
          },
          ratingFacet: {
            type: "number",
            path: "rating",
            boundaries: [1, 2, 3, 4, 5]
          }
        }
      }
    }
  }
])
```

## Date Facets

```javascript
db.articles.aggregate([
  {
    $searchMeta: {
      facet: {
        operator: {
          text: { query: "mongodb", path: "title" }
        },
        facets: {
          publishDateFacet: {
            type: "date",
            path: "publishedAt",
            boundaries: [
              new Date("2022-01-01"),
              new Date("2023-01-01"),
              new Date("2024-01-01"),
              new Date("2025-01-01")
            ],
            default: "Other"
          }
        }
      }
    }
  }
])
```

## Getting Total Count Only

Use `$searchMeta` with a search operator (without the `facet` collector) to retrieve just the count metadata:

```javascript
db.products.aggregate([
  {
    $searchMeta: {
      index: "products_search",
      text: { query: "headphones", path: "name" }
    }
  }
])
// Output: { count: { lowerBound: 247 } }
```

## Combining $search and $searchMeta

Run `$search` and `$searchMeta` as parallel queries to get search results AND metadata together:

```javascript
async function searchWithFacets(query, page, pageSize) {
  const [results, meta] = await Promise.all([
    db.products.aggregate([
      { $search: { text: { query: query, path: "name" } } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize }
    ]).toArray(),
    db.products.aggregate([
      {
        $searchMeta: {
          facet: {
            operator: { text: { query: query, path: "name" } },
            facets: {
              categoryFacet: { type: "string", path: "category" },
              brandFacet:    { type: "string", path: "brand" }
            }
          }
        }
      }
    ]).toArray()
  ]);

  return {
    products: results,
    facets: meta[0].facet,
    total: meta[0].count.lowerBound
  };
}
```

## Practical Use Case - Filter Panel

Build a dynamic filter sidebar that updates counts based on search:

```javascript
db.properties.aggregate([
  {
    $searchMeta: {
      facet: {
        operator: {
          compound: {
            must: [{ text: { query: "downtown", path: "neighborhood" } }],
            filter: [{ range: { path: "bedrooms", gte: 2 } }]
          }
        },
        facets: {
          propertyType: { type: "string", path: "type" },
          priceRange: {
            type: "number",
            path: "price",
            boundaries: [500000, 750000, 1000000, 1500000, 2000000]
          },
          amenities: { type: "string", path: "amenities" }
        }
      }
    }
  }
])
```

## Summary

`$searchMeta` is a specialized Atlas Search stage for retrieving facet counts and search metadata without fetching full document bodies. It is the foundation of interactive filter panels in search UIs, providing real-time counts for string, numeric, and date facets. For combined search results with metadata, use it alongside `$search` in parallel queries or within a `$facet` stage.
