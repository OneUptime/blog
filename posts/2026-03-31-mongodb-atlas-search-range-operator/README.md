# How to Use the range Operator for Numeric and Date Searches in Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Range, Filter, Atlas

Description: Learn how to use the Atlas Search range operator to filter documents by numeric and date ranges within full-text search aggregation pipelines.

---

The `range` operator in MongoDB Atlas Search filters documents based on numeric or date boundaries. It works like a "between" filter, supporting inclusive and exclusive bounds, and integrates with `compound` to combine range filtering with full-text search.

## Supported Types

The `range` operator works on fields indexed as:
- `number` (int32, int64, double)
- `date`
- `objectId`
- `string` (with `token` field type, for lexicographic range)

## Basic Numeric Range

Find products priced between $20 and $100 (inclusive):

```javascript
db.products.aggregate([
  {
    $search: {
      range: {
        path: "price",
        gte: 20,
        lte: 100
      }
    }
  },
  {
    $project: {
      name: 1,
      price: 1
    }
  }
])
```

## Exclusive Bounds

Use `gt` and `lt` for exclusive bounds:

```javascript
db.products.aggregate([
  {
    $search: {
      range: {
        path: "price",
        gt: 0,
        lt: 50
      }
    }
  }
])
```

## One-Sided Range

Find products cheaper than $30:

```javascript
db.products.aggregate([
  {
    $search: {
      range: {
        path: "price",
        lte: 30
      }
    }
  }
])
```

## Date Range Search

Find articles published in Q1 2026:

```javascript
db.articles.aggregate([
  {
    $search: {
      range: {
        path: "publishedAt",
        gte: ISODate("2026-01-01T00:00:00Z"),
        lt:  ISODate("2026-04-01T00:00:00Z")
      }
    }
  },
  {
    $project: {
      title: 1,
      publishedAt: 1
    }
  },
  { $sort: { publishedAt: -1 } }
])
```

## Combining range with Text Search Using compound

The most practical use of `range` is as a `filter` alongside a text search. Using `filter` means the range condition does not affect the relevance score:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "wireless headphones",
              path: ["name", "description"]
            }
          }
        ],
        filter: [
          {
            range: {
              path: "price",
              gte: 50,
              lte: 300
            }
          },
          {
            range: {
              path: "reviewScore",
              gte: 4.0
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      price: 1,
      reviewScore: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } }
])
```

## Using range in should for Score Boosting

Boost documents within a premium price range:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          { text: { query: "camera lens", path: "name" } }
        ],
        should: [
          {
            range: {
              path: "reviewScore",
              gte: 4.5,
              score: { boost: { value: 2 } }
            }
          }
        ]
      }
    }
  }
])
```

## Index Mapping for range

Ensure numeric and date fields are correctly typed in the index:

```json
{
  "mappings": {
    "fields": {
      "price": { "type": "number" },
      "reviewScore": { "type": "number" },
      "publishedAt": { "type": "date" }
    }
  }
}
```

## Summary

The `range` operator in Atlas Search provides efficient filtering on numeric and date fields. Used as a `filter` inside `compound`, it restricts results without skewing relevance scores, making it ideal for price filters, date windows, and rating thresholds alongside full-text queries.

