# How to Use the in Operator in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, IN Operator, Filter, Atlas

Description: Learn how to use the Atlas Search in operator to match documents where a field value equals any value in a specified list, enabling multi-value exact filters.

---

The `in` operator in MongoDB Atlas Search matches documents where a field contains any value from a provided list. It is the Atlas Search equivalent of MongoDB's `$in` query operator, and is particularly useful for filtering by category lists, user IDs, status codes, or any discrete set of values within a full-text search pipeline.

## Basic Usage

Find products in the "electronics" or "accessories" categories:

```javascript
db.products.aggregate([
  {
    $search: {
      in: {
        path: "category",
        value: ["electronics", "accessories"]
      }
    }
  },
  {
    $project: {
      name: 1,
      category: 1
    }
  }
])
```

## Supported Field Types

The `in` operator supports fields indexed as:
- `string` (with `keyword` analyzer for exact match)
- `number`
- `boolean`
- `objectId`
- `date`

## Filtering by Multiple Status Values

Match orders in any of several states:

```javascript
db.orders.aggregate([
  {
    $search: {
      in: {
        path: "status",
        value: ["pending", "processing", "shipped"]
      }
    }
  },
  {
    $project: {
      orderId: 1,
      status: 1,
      createdAt: 1
    }
  }
])
```

## Filtering by ObjectId List

Find documents belonging to a specific set of user IDs:

```javascript
db.orders.aggregate([
  {
    $search: {
      in: {
        path: "userId",
        value: [
          ObjectId("64a1f2c3b4e5f6789abc1234"),
          ObjectId("64a1f2c3b4e5f6789abc1235"),
          ObjectId("64a1f2c3b4e5f6789abc1236")
        ]
      }
    }
  }
])
```

## Using in as a filter Inside compound

The most effective pattern is using `in` as a `filter` clause inside `compound`, so it restricts results without affecting the text search relevance score:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "noise cancelling",
              path: ["name", "description"]
            }
          }
        ],
        filter: [
          {
            in: {
              path: "brand",
              value: ["Sony", "Bose", "Apple", "Samsung"]
            }
          },
          {
            in: {
              path: "status",
              value: ["available", "pre-order"]
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      brand: 1,
      price: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } }
])
```

## Filtering by Array Field Values

When a document field is an array, `in` matches if any element in the field array appears in the value list:

```javascript
// Documents: { tags: ["mongodb", "database", "nosql"] }
db.articles.aggregate([
  {
    $search: {
      in: {
        path: "tags",
        value: ["mongodb", "postgresql"]
      }
    }
  }
])
```

## Index Configuration

For string fields, use the `keyword` analyzer to ensure exact value matching:

```json
{
  "mappings": {
    "fields": {
      "category": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "status": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "brand": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

## Summary

The `in` operator provides efficient multi-value exact matching in Atlas Search for strings, numbers, ObjectIds, and dates. Used as a `filter` inside `compound`, it restricts results to a specific set of values without interfering with full-text relevance scores, making it ideal for faceted search UI elements like category pickers and status dropdowns.

