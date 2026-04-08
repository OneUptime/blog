# How to Create a Dynamic Mapping for Atlas Search Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Index, Dynamic Mapping, Full-Text Search

Description: Learn how to use dynamic mappings in Atlas Search to automatically index all document fields, and when to combine dynamic with static field overrides.

---

## What Dynamic Mapping Does

When you create an Atlas Search index with `"dynamic": true`, Atlas automatically indexes every field in every document according to its BSON type. Strings become full-text indexed with the standard analyzer, numbers support range queries, and dates support date range filters - all without declaring any field names. This is ideal during prototyping or when your schema is unpredictable.

## Creating a Fully Dynamic Index

Via the Atlas UI JSON editor or CLI, define a fully dynamic index:

```json
{
  "name": "dynamic-index",
  "collectionName": "articles",
  "database": "blog",
  "mappings": {
    "dynamic": true
  }
}
```

Via the Atlas CLI:

```bash
atlas clusters search indexes create \
  --clusterName MyCluster \
  --file dynamic-index.json
```

## Querying a Dynamic Index

Once created, you can search any field without specifying a path, or target specific fields:

```javascript
// Search all dynamically indexed string fields
db.articles.aggregate([
  { $search: {
    index: "dynamic-index",
    text: {
      query: "kubernetes observability",
      path: { wildcard: "*" }
    }
  }},
  { $limit: 5 },
  { $project: { title: 1, score: { $meta: "searchScore" } } }
]);
```

Targeting a specific field:

```javascript
db.articles.aggregate([
  { $search: {
    index: "dynamic-index",
    text: {
      query: "performance tuning",
      path: "content"
    }
  }}
]);
```

## Combining Dynamic and Static Mappings

The most powerful pattern mixes dynamic indexing for general fields with static overrides for specific fields where you need custom analyzers or facets:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.english",
        "multi": {
          "exact": { "type": "string", "analyzer": "lucene.keyword" }
        }
      },
      "tags": [
        { "type": "string", "analyzer": "lucene.keyword" },
        { "type": "stringFacet" }
      ],
      "publishedAt": {
        "type": "date"
      }
    }
  }
}
```

Here, `title` gets a custom English analyzer with an exact-match variant, `tags` supports faceting, and everything else is indexed dynamically.

## Dynamic Type Mapping Rules

Atlas Search follows these automatic type mappings:

```text
BSON String     -> string (lucene.standard analyzer)
BSON Int32/64   -> number
BSON Double     -> number
BSON Date       -> date
BSON Boolean    -> boolean
BSON ObjectId   -> objectId
BSON Array      -> each element indexed by its type
BSON Document   -> fields recursively indexed
```

## Performance Considerations

Dynamic indexing has trade-offs:
- Index size grows with every field and value
- Fields you never search still consume storage and memory
- No control over which analyzer is used for strings

To check how many documents the search index covers:

```javascript
db.articles.aggregate([
  { $searchMeta: {
    index: "dynamic-index",
    count: { type: "total" }
  }}
]);
```

Use the Atlas UI to review index size and which fields were indexed.

## Summary

Dynamic mapping in Atlas Search automatically indexes all document fields based on their BSON types, making it the fastest way to get full-text search running. For production use, combine `"dynamic": true` with explicit field overrides in `"fields"` to apply custom analyzers to critical fields like titles, enable faceting on category fields, and control index size. Transition from fully dynamic to partially static mappings as your schema stabilizes.
