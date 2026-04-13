# How to Deploy Atlas Search Indexes with the Atlas CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Search, Index, CLI

Description: Learn how to create, update, and manage Atlas Search indexes from the command line to enable full-text and semantic search on your collections.

---

## What Is Atlas Search?

Atlas Search is MongoDB's built-in full-text search engine powered by Apache Lucene. It runs directly inside your Atlas cluster and supports fuzzy matching, facets, autocomplete, and vector search without any external search infrastructure.

## Listing Search Indexes

View all existing search indexes on a cluster:

```bash
atlas clusters search indexes list \
  --clusterName myCluster \
  --db myDatabase \
  --collection products
```

## Creating a Basic Search Index

A default index with dynamic mapping indexes all fields with supported data types automatically:

```bash
atlas clusters search indexes create \
  --clusterName myCluster \
  --file search-index.json
```

The `search-index.json` file:

```json
{
  "name": "default",
  "database": "myDatabase",
  "collectionName": "products",
  "mappings": {
    "dynamic": true
  }
}
```

## Creating a Static Mapping Index

Static mappings give you control over how each field is indexed:

```json
{
  "name": "product_search",
  "database": "myDatabase",
  "collectionName": "products",
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "category": {
        "type": "token"
      },
      "price": {
        "type": "number"
      }
    }
  }
}
```

```bash
atlas clusters search indexes create \
  --clusterName myCluster \
  --file product-search-index.json
```

## Creating an Autocomplete Index

For search-as-you-type functionality:

```json
{
  "name": "autocomplete_index",
  "database": "myDatabase",
  "collectionName": "products",
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [
        {
          "type": "autocomplete",
          "tokenization": "edgeGram",
          "minGrams": 2,
          "maxGrams": 15,
          "foldDiacritics": true
        }
      ]
    }
  }
}
```

## Watching Index Build Progress

Search index creation is asynchronous. Use `watch` to block until it is ready:

```bash
atlas clusters search indexes describe <INDEX_ID> \
  --clusterName myCluster
```

Poll in a script:

```bash
while true; do
  STATUS=$(atlas clusters search indexes describe "$INDEX_ID" \
    --clusterName myCluster --output json | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "ACTIVE" ] && break
  sleep 10
done
```

## Updating an Existing Index

Modify the index definition when your schema evolves:

```bash
atlas clusters search indexes update <INDEX_ID> \
  --clusterName myCluster \
  --file updated-index.json
```

## Creating a Vector Search Index

For AI-powered semantic search using embeddings:

```json
{
  "name": "vector_index",
  "database": "myDatabase",
  "collectionName": "embeddings",
  "type": "vectorSearch",
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

```bash
atlas clusters search indexes create \
  --clusterName myCluster \
  --file vector-index.json
```

## Deleting a Search Index

Remove an index that is no longer needed:

```bash
atlas clusters search indexes delete <INDEX_ID> \
  --clusterName myCluster \
  --force
```

## Summary

The Atlas CLI makes search index management fully scriptable. Store index definitions as JSON files in your repository, apply them with `atlas clusters search indexes create`, and poll the status programmatically. This approach integrates cleanly into deployment pipelines and keeps your search configuration version-controlled.
