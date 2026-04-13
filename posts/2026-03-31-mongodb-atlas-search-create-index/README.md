# How to Create an Atlas Search Index in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Index, Full-Text Search, Atlas

Description: Learn how to create Atlas Search indexes using the Atlas UI, Atlas CLI, and the $search aggregation stage for full-text search on MongoDB collections.

---

MongoDB Atlas Search is a full-text search engine built on Apache Lucene and embedded directly into Atlas. Creating a search index is the first step to enabling advanced text search, fuzzy matching, autocomplete, and faceted search on your collections.

## Prerequisites

- A MongoDB Atlas cluster (M0 free tier works)
- At least one collection with documents to search

## Creating a Search Index via the Atlas UI

1. Open your cluster in the Atlas dashboard
2. Click the **Search** tab
3. Click **Create Search Index**
4. Choose **Visual Editor** or **JSON Editor**
5. Select your database and collection
6. Name the index (default is `default`)
7. Click **Create Search Index**

The dynamic mapping configuration (used in step 4) is:

```json
{
  "mappings": {
    "dynamic": true
  }
}
```

Dynamic mapping automatically indexes all string, numeric, and date fields.

## Creating a Search Index via the Atlas CLI

```bash
# Authenticate
atlas auth login

# Create an index from a JSON definition file
atlas clusters search indexes create \
  --clusterName MyCluster \
  --file search-index.json
```

Contents of `search-index.json`:

```json
{
  "name": "default",
  "database": "myapp",
  "collectionName": "products",
  "mappings": {
    "dynamic": true
  }
}
```

## Creating a Static Mapping Index

Static mappings give you precise control over which fields are indexed and how:

```json
{
  "name": "products_search",
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "price": {
        "type": "number"
      },
      "category": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

## Using the Search Index with $search

Once the index is created, use the `$search` aggregation stage to query it:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "products_search",
      text: {
        query: "wireless headphones",
        path: ["name", "description"]
      }
    }
  },
  {
    $project: {
      name: 1,
      price: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $limit: 10 }
])
```

## Checking Index Status

Verify the index is ready before querying:

```javascript
db.products.getSearchIndexes()
```

Or via Atlas CLI:

```bash
atlas clusters search indexes list \
  --clusterName MyCluster \
  --db myapp \
  --collection products
```

## Summary

Atlas Search indexes are created through the Atlas UI, CLI, or API using JSON mapping definitions. Dynamic mappings work well to start, while static mappings give you control over analyzers and field types. Once the index is active, the `$search` stage provides powerful full-text search capabilities that far exceed MongoDB's built-in text indexes.

