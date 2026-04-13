# How to Use the Keyword Analyzer in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Analyzer, Keyword, Exact Match

Description: Learn how the keyword analyzer works in MongoDB Atlas Search for exact-match search, faceting, and sorting by treating the entire field value as a single token.

---

## What Is the Keyword Analyzer?

The keyword analyzer in MongoDB Atlas Search (based on Lucene's KeywordAnalyzer) treats the entire field value as a single, unmodified token. It performs no tokenization, no lowercasing, and no filtering. The complete string is indexed as-is.

```text
Input: "New York, NY"
Keyword analyzer token: ["New York, NY"]  (one token, entire string)

Input: "mongodb-atlas"
Keyword analyzer token: ["mongodb-atlas"]  (no splitting on hyphens)
```

## When to Use the Keyword Analyzer

The keyword analyzer is the right choice for:

- **Exact match search** on identifiers, codes, and slugs
- **Faceted search** on category values, status fields, and enum fields
- **Sorting** by a text field (using a `token` type mapping in the Atlas Search index)
- **Auto-suggest** on structured values like country codes or product SKUs
- Fields where the entire value is the searchable unit

## Configuring a Keyword Analyzer Index

```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "status": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "countryCode": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "sku": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

## Exact Match Queries

```javascript
// Find all orders with status "shipped"
db.orders.aggregate([
  {
    $search: {
      index: "orders_search",
      text: {
        query: "shipped",
        path: "status"
      }
    }
  },
  { $project: { orderId: 1, status: 1 } }
])
```

Because `"shipped"` is indexed as a single keyword token, this query matches exactly `"shipped"` and not `"shipping"` or `"ship"`.

## Faceted Search with the Keyword Analyzer

Facets require keyword-analyzed string fields to count distinct values:

```javascript
db.products.aggregate([
  {
    $searchMeta: {
      index: "products_search",
      facet: {
        operator: {
          text: { query: "laptop", path: "title" }
        },
        facets: {
          brandFacet:    { type: "string", path: "brand" },
          categoryFacet: { type: "string", path: "category" },
          statusFacet:   { type: "string", path: "status" }
        }
      }
    }
  }
])
```

The `brand`, `category`, and `status` fields must be indexed with `stringFacet` type for faceting to work. They can also be indexed with `lucene.keyword` for exact-match queries on those fields.

## Sorting with Atlas Search

Atlas Search uses a `token` type mapping for sorting by string fields:

```javascript
{
  "mappings": {
    "fields": {
      "title": [
        {
          "type": "string",
          "analyzer": "lucene.standard"
        },
        {
          "type": "token"
        }
      ]
    }
  }
}
```

Sort by the title field using the `sort` option within `$search`:

```javascript
db.articles.aggregate([
  {
    $search: {
      index: "articles_search",
      text: { query: "mongodb", path: "title" },
      sort: { title: 1 }
    }
  }
])
```

## Combining Keyword with Standard Analyzer

A common pattern is to index the same field with multiple analyzers using the `multi` property - once with standard for full-text search, once with keyword for exact match:

```javascript
{
  "mappings": {
    "fields": {
      "category": {
        "type": "string",
        "analyzer": "lucene.standard",
        "multi": {
          "keyword": {
            "type": "string",
            "analyzer": "lucene.keyword"
          }
        }
      }
    }
  }
}
```

## Summary

The MongoDB Atlas Search keyword analyzer indexes the entire field value as a single unmodified token. It is the right choice for exact-match queries on identifiers and codes. For faceted search, use `stringFacet` type mappings, and for sorting, use `token` type mappings. For fields that need both word-level search and exact-match capabilities, use the `multi` property to combine `lucene.standard` for search and `lucene.keyword` for exact match.
