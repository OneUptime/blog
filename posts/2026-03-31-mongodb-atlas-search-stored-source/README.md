# How to Use Stored Source in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Performance

Description: Use stored source in MongoDB Atlas Search to return field values directly from the search index without a roundtrip to the database, reducing query latency.

---

By default, Atlas Search returns document `_id` values and then fetches the full document from the MongoDB collection. This involves an extra read from the storage engine. The `storedSource` feature lets you store selected fields inside the search index itself, so Atlas can return them without hitting the collection.

## When to Use Stored Source

Stored source is valuable when:

- Your search result cards only need a subset of fields (title, thumbnail, price)
- The full document is large and fetching it adds measurable latency
- You want to reduce load on your primary or secondary nodes

## Enabling Stored Source in the Index Definition

Set `storedSource` to `true` to store all fields in the documents, or supply an `include`/`exclude` list:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string" },
      "price": { "type": "number" },
      "category": { "type": "string" },
      "description": { "type": "string" }
    }
  },
  "storedSource": {
    "include": ["title", "price", "category"]
  }
}
```

To store everything:

```json
{
  "storedSource": true
}
```

To store everything except large fields:

```json
{
  "storedSource": {
    "exclude": ["longDescription", "rawHtml"]
  }
}
```

## Querying with returnStoredSource

Add `returnStoredSource: true` to your `$search` stage to instruct Atlas to return stored values rather than fetching from the collection:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "product_index",
      text: {
        query: "bluetooth speaker",
        path: "title"
      },
      returnStoredSource: true
    }
  },
  { $limit: 10 },
  { $project: { title: 1, price: 1, category: 1, score: { $meta: "searchScore" } } }
])
```

The `$$SEARCH_META` variable and score are always available regardless of stored source configuration.

## Verifying the Behavior

You can confirm stored source is being used by examining the `explain` output. When `returnStoredSource` is enabled, the `$_internalSearchIdLookup` stage skips the full document lookup from the collection.

```javascript
db.products.explain("executionStats").aggregate([
  {
    $search: {
      index: "product_index",
      text: { query: "speaker", path: "title" },
      returnStoredSource: true
    }
  }
])
```

## Index Size Considerations

Stored source increases the size of the search index on disk since field values are duplicated. Profile the size impact before enabling it across large collections:

Check the Atlas Search index size from the **Atlas UI metrics** page or the Atlas Admin API. The standard `collStats` command does not report Atlas Search index sizes since those indexes are managed by the separate `mongot` process.

A common pattern is to store only the fields that appear in search result cards (3-6 fields), keeping the index size manageable.

## Mixing Stored Source and Collection Lookups

You can use `$lookup` or a subsequent `$project` stage after `$search` to fetch additional fields from the collection when needed for a detail view - stored source handles the fast list view, and the collection handles the full record.

```javascript
db.products.aggregate([
  {
    $search: {
      index: "product_index",
      text: { query: "laptop", path: "title" },
      returnStoredSource: true
    }
  },
  { $limit: 20 },
  // Stored source fields are available here
  { $project: { title: 1, price: 1, score: { $meta: "searchScore" } } }
])
```

## Summary

Stored source in Atlas Search reduces query latency by returning field values from the index itself rather than fetching full documents from the collection. Enable it for the fields shown in search result cards, use `returnStoredSource: true` in your queries, and monitor index size growth. This is one of the most impactful optimizations for high-throughput search workloads.
