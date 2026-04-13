# How to Migrate from Elasticsearch to MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Elasticsearch, Migration, Full-Text Search

Description: Migrate your full-text search workloads from Elasticsearch to MongoDB Atlas Search to reduce infrastructure complexity by consolidating your database and search.

---

## Overview

MongoDB Atlas Search embeds Apache Lucene-powered full-text search directly into MongoDB Atlas, eliminating the need to run a separate Elasticsearch cluster and sync pipeline. Migrating from Elasticsearch to Atlas Search simplifies your stack, reduces operational overhead, and lets you query search results alongside regular MongoDB data in a single aggregation pipeline.

## Why Migrate

- No separate sync pipeline to maintain
- Data is always consistent - no replication lag
- Unified query language (MongoDB aggregation)
- Lower infrastructure cost
- Search indexes update automatically as documents change

## Step 1 - Assess Your Elasticsearch Usage

Document your current Elasticsearch usage:

```bash
# List all indices and their sizes
curl "localhost:9200/_cat/indices?v&h=index,docs.count,store.size"

# Export an index mapping
curl "localhost:9200/products/_mapping?pretty" > products-mapping.json

# Sample queries to migrate
curl "localhost:9200/products/_search" -H "Content-Type: application/json" -d '{
  "query": {
    "multi_match": {
      "query": "wireless headphones",
      "fields": ["name^2", "description"]
    }
  }
}' > sample-query.json
```

## Step 2 - Create an Atlas Search Index

In MongoDB Atlas, create a search index from the Atlas UI or via the CLI:

```json
{
  "name": "products-search",
  "analyzer": "lucene.english",
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [
        {
          "type": "string",
          "analyzer": "lucene.english",
          "multi": {
            "keywordAnalyzer": {
              "type": "string",
              "analyzer": "lucene.keyword"
            }
          }
        },
        {
          "type": "autocomplete",
          "tokenization": "edgeGram",
          "minGrams": 3,
          "maxGrams": 15
        }
      ],
      "description": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "category": {
        "type": "stringFacet"
      },
      "price": {
        "type": "number"
      },
      "tags": {
        "type": "string"
      }
    }
  }
}
```

Using the Atlas CLI:

```bash
atlas clusters search indexes create \
  --clusterName myCluster \
  --db ecommerce \
  --collection products \
  --file products-search-index.json
```

## Step 3 - Map Elasticsearch Queries to Atlas Search

### Basic Full-Text Search

```javascript
// Elasticsearch
{
  "query": {
    "multi_match": {
      "query": "wireless headphones",
      "fields": ["name^2", "description"]
    }
  }
}

// Atlas Search equivalent
db.products.aggregate([
  {
    $search: {
      index: "products-search",
      compound: {
        should: [
          {
            text: {
              query: "wireless headphones",
              path: "name",
              score: { boost: { value: 2 } }
            }
          },
          {
            text: {
              query: "wireless headphones",
              path: "description"
            }
          }
        ]
      }
    }
  },
  {
    $limit: 10
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

### Filtered Search with Facets

```javascript
// Elasticsearch
{
  "query": {
    "bool": {
      "must": [{ "match": { "name": "headphones" } }],
      "filter": [{ "range": { "price": { "lte": 200 } } }]
    }
  },
  "aggs": {
    "by_category": { "terms": { "field": "category" } }
  }
}

// Atlas Search equivalent
db.products.aggregate([
  {
    $searchMeta: {
      index: "products-search",
      facet: {
        operator: {
          compound: {
            must: [
              { text: { query: "headphones", path: "name" } }
            ],
            filter: [
              { range: { path: "price", lte: 200 } }
            ]
          }
        },
        facets: {
          categoryFacet: {
            type: "string",
            path: "category"
          }
        }
      }
    }
  }
])
```

### Autocomplete

```javascript
// Atlas Search autocomplete
db.products.aggregate([
  {
    $search: {
      index: "products-search",
      autocomplete: {
        query: "wire",
        path: "name",
        fuzzy: { maxEdits: 1 }
      }
    }
  },
  { $limit: 5 },
  { $project: { name: 1 } }
])
```

## Step 4 - Data Migration Script

If your data was only in Elasticsearch, re-ingest from your source:

```python
from elasticsearch import Elasticsearch, helpers
from pymongo import MongoClient

es = Elasticsearch(["http://localhost:9200"])
mongo = MongoClient("mongodb+srv://user:pass@cluster.mongodb.net/")
db = mongo["ecommerce"]

def migrate_index(es_index, mongo_collection):
    print(f"Migrating {es_index} to {mongo_collection}...")
    docs = []

    for hit in helpers.scan(es, index=es_index, query={"query": {"match_all": {}}}):
        doc = hit["_source"]
        doc["_id"] = hit["_id"]
        docs.append(doc)

        if len(docs) >= 500:
            db[mongo_collection].insert_many(docs, ordered=False)
            docs = []
            print(".", end="", flush=True)

    if docs:
        db[mongo_collection].insert_many(docs, ordered=False)

    print(f"\nDone migrating {es_index}")

migrate_index("products", "products")
```

## Step 5 - Update Application Code

```javascript
// Before - Elasticsearch client
const { Client } = require("@elastic/elasticsearch")
const es = new Client({ node: "http://localhost:9200" })

async function search(query) {
  const result = await es.search({
    index: "products",
    body: { query: { match: { name: query } } }
  })
  return result.hits.hits.map(h => h._source)
}

// After - MongoDB Atlas Search
const { MongoClient } = require("mongodb")
const client = new MongoClient(process.env.MONGODB_URI)

async function search(query) {
  const db = client.db("ecommerce")
  return db.collection("products").aggregate([
    {
      $search: {
        index: "products-search",
        text: { query, path: ["name", "description"] }
      }
    },
    { $limit: 20 },
    { $project: { name: 1, price: 1, score: { $meta: "searchScore" } } }
  ]).toArray()
}
```

## Step 6 - Decommission Elasticsearch

After validating Atlas Search results match Elasticsearch:

```bash
# Stop sync pipelines (Monstache, Logstash, etc.)
systemctl stop monstache

# Verify no traffic hitting Elasticsearch
curl "localhost:9200/_nodes/stats/indices/search?pretty" | grep query_total

# Remove Elasticsearch from docker-compose or helm
```

## Summary

Migrating from Elasticsearch to MongoDB Atlas Search consolidates your search and database tiers, eliminating synchronization pipelines and replication lag. The Atlas Search query API uses MongoDB aggregation stages like `$search` and `$searchMeta`, which map closely to Elasticsearch's bool queries, match queries, and faceted aggregations. Once migrated, your application can combine full-text search results with MongoDB joins, filters, and aggregations in a single query.
