# How to Use the equals Operator in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Equals, Filter, Atlas

Description: Learn how to use the Atlas Search equals operator to match exact values on boolean, number, date, and ObjectId fields in search queries.

---

The `equals` operator in MongoDB Atlas Search performs exact value matching on indexed fields. Unlike the `text` operator which uses analyzers for string matching, `equals` compares exact values - making it ideal for filtering by status, flags, IDs, or numeric values within a full-text search pipeline.

## When to Use equals

- Boolean fields: `isActive`, `inStock`, `verified`
- Exact string values with `keyword` analyzer
- ObjectId matching
- Numeric exact matches
- Date exact matches

## Basic Boolean Filter

Find only active products:

```javascript
db.products.aggregate([
  {
    $search: {
      equals: {
        path: "inStock",
        value: true
      }
    }
  },
  {
    $project: {
      name: 1,
      inStock: 1
    }
  }
])
```

## Matching an Exact String Value

For exact string matching, the field must be indexed with the `keyword` analyzer (not `standard`):

```json
{
  "mappings": {
    "fields": {
      "status": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

Then query:

```javascript
db.orders.aggregate([
  {
    $search: {
      equals: {
        path: "status",
        value: "completed"
      }
    }
  }
])
```

## Matching by ObjectId

Match a specific document by ObjectId:

```javascript
db.orders.aggregate([
  {
    $search: {
      equals: {
        path: "userId",
        value: ObjectId("64a1f2c3b4e5f6789abc1234")
      }
    }
  }
])
```

## Matching an Exact Number

Find products with exactly 0 units in stock:

```javascript
db.products.aggregate([
  {
    $search: {
      equals: {
        path: "stockCount",
        value: 0
      }
    }
  }
])
```

## Using equals Inside compound

The most common pattern is using `equals` as a `filter` inside `compound` so it restricts results without affecting the search score:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "laptop computer",
              path: ["name", "description"]
            }
          }
        ],
        filter: [
          {
            equals: {
              path: "inStock",
              value: true
            }
          },
          {
            equals: {
              path: "category",
              value: "electronics"
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
      score: { $meta: "searchScore" }
    }
  }
])
```

## Matching Exact Date Values

Match documents with a specific date (must be indexed as `date` type):

```javascript
db.events.aggregate([
  {
    $search: {
      equals: {
        path: "eventDate",
        value: ISODate("2026-03-15T00:00:00Z")
      }
    }
  }
])
```

## Difference Between equals and range

```text
Operator | Use case
---------|------------------------------------------
equals   | Exact value: status = "active"
range    | Numeric or date range: price >= 10 AND <= 100
```

## Summary

The `equals` operator provides exact value matching in Atlas Search for booleans, numbers, ObjectIds, and keyword-analyzed strings. It is most powerful when used as a `filter` clause inside `compound`, applying restrictions that do not distort relevance scores from text search operators.

