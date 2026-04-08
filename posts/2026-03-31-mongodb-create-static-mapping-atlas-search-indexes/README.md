# How to Create a Static Mapping for Atlas Search Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Index, Static Mapping, Full-Text Search

Description: Learn how to create static field mappings for Atlas Search indexes to control exactly which fields are indexed, their types, and search behavior.

---

## Static vs. Dynamic Mappings

Atlas Search indexes support two mapping modes. Dynamic mappings index every field automatically as its inferred type - convenient but wasteful on storage. Static mappings let you declare exactly which fields to index, their data types, and how they should be analyzed. Use static mappings when you know your schema and want to minimize index size and control analyzer behavior.

## Creating a Static Index via the Atlas UI

In Atlas, navigate to your cluster, open the Search tab, and click Create Search Index. Choose the JSON editor and enter a definition like:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.english",
        "multi": {
          "keywordAnalyzer": {
            "type": "string",
            "analyzer": "lucene.keyword"
          }
        }
      },
      "price": {
        "type": "number"
      },
      "category": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "inStock": {
        "type": "boolean"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}
```

Setting `"dynamic": false` ensures that only the explicitly declared fields are indexed.

## Creating a Static Index via the Atlas CLI

```bash
atlas clusters search indexes create \
  --clusterName MyCluster \
  --file search-index.json
```

Where `search-index.json` is:

```json
{
  "name": "product-static-index",
  "collectionName": "products",
  "database": "shop",
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.english" },
      "price": { "type": "number" },
      "category": { "type": "string", "analyzer": "lucene.keyword" },
      "inStock": { "type": "boolean" }
    }
  }
}
```

## Querying a Statically Mapped Index

```javascript
db.products.aggregate([
  { $search: {
    index: "product-static-index",
    compound: {
      must: [
        { text: { query: "wireless headphones", path: "title" } }
      ],
      filter: [
        { equals: { path: "inStock", value: true } },
        { range: { path: "price", gte: 50, lte: 200 } }
      ]
    }
  }},
  { $limit: 10 },
  { $project: { title: 1, price: 1, category: 1, score: { $meta: "searchScore" } } }
]);
```

## Field Types in Static Mappings

| Type | Use Case |
|------|----------|
| `string` | Full-text search with analyzer |
| `number` | Range queries, sorting |
| `date` | Date range filters |
| `boolean` | Exact match filters |
| `objectId` | ID lookups |
| `embeddedDocuments` | Nested object fields |

## Multi-Analyzer Fields

Use the `multi` property to index the same field with multiple analyzers - one for full-text search, one for exact keyword matching:

```json
"name": {
  "type": "string",
  "analyzer": "lucene.standard",
  "multi": {
    "exact": {
      "type": "string",
      "analyzer": "lucene.keyword"
    }
  }
}
```

Query the keyword variant with `path: "name.exact"` for exact matches.

## Summary

Static mappings in Atlas Search give you full control over which fields are indexed and how they are analyzed. Set `"dynamic": false` and list each field with its type and analyzer. This reduces index storage, prevents inadvertently indexing sensitive fields, and lets you apply different analyzers to the same field via `multi` mappings. Use the Atlas CLI or UI JSON editor to create and update static indexes.
