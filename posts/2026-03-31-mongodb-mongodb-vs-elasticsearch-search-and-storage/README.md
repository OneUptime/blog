# MongoDB vs Elasticsearch: Search and Storage Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Elasticsearch, Search, NoSQL, Database

Description: Compare MongoDB and Elasticsearch for search and storage use cases, covering indexing, query language, scaling, and when to use each.

---

## Overview

MongoDB and Elasticsearch are both document-oriented stores, but their design priorities differ. MongoDB is a general-purpose database optimized for CRUD operations and complex queries. Elasticsearch is a distributed search and analytics engine optimized for full-text search, log analysis, and near real-time indexing.

## Full-Text Search Capabilities

Elasticsearch was built for search from the ground up. It uses an inverted index, tokenization, analyzers, and relevance scoring based on BM25.

```json
// Elasticsearch query with relevance scoring
{
  "query": {
    "multi_match": {
      "query": "mongodb performance tuning",
      "fields": ["title^3", "body"],
      "fuzziness": "AUTO"
    }
  },
  "highlight": {
    "fields": { "body": {} }
  }
}
```

MongoDB's `$text` operator and Atlas Search provide full-text search but with less out-of-the-box tuning for relevance ranking. Atlas Search (powered by Lucene) closes this gap significantly.

```javascript
// MongoDB Atlas Search
db.articles.aggregate([
  {
    $search: {
      index: "default",
      text: { query: "performance tuning", path: ["title", "body"], fuzzy: {} }
    }
  },
  { $limit: 10 }
]);
```

## Data Model and Writes

MongoDB is optimized for read-modify-write operations. You can update individual fields in a document without reindexing the entire document.

```javascript
// MongoDB partial update - efficient
db.users.updateOne(
  { _id: userId },
  { $set: { lastLogin: new Date() } }
);
```

Elasticsearch updates are expensive because every document is immutable internally - an update deletes the old document and creates a new one. This makes Elasticsearch write-heavy for frequently updated records.

## Aggregations and Analytics

Both support aggregation, but the syntax and strengths differ.

```javascript
// MongoDB aggregation pipeline
db.logs.aggregate([
  { $match: { level: "ERROR", ts: { $gte: new Date(Date.now() - 86400000) } } },
  { $group: { _id: "$service", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

```json
// Elasticsearch aggregation (equivalent)
{
  "query": {
    "bool": {
      "must": [
        { "term": { "level": "ERROR" } },
        { "range": { "ts": { "gte": "now-1d" } } }
      ]
    }
  },
  "aggs": {
    "by_service": {
      "terms": { "field": "service.keyword", "size": 10 }
    }
  }
}
```

Elasticsearch excels at metrics, histograms, and time-series aggregations across billions of log records - this is the foundation of the ELK stack.

## Scaling Model

Elasticsearch is natively distributed. Sharding and replication are first-class citizens configured at index creation time.

```bash
# Create Elasticsearch index with custom sharding
curl -X PUT "localhost:9200/logs" -H 'Content-Type: application/json' -d '{
  "settings": { "number_of_shards": 5, "number_of_replicas": 1 }
}'
```

MongoDB scales via replica sets for high availability and sharding for horizontal partitioning. Sharding requires more manual configuration.

## When to Use Each

Use Elasticsearch for: log aggregation and observability (ELK/OpenSearch stack), product catalog search with facets and relevance ranking, autocomplete, and geospatial search at scale.

Use MongoDB for: primary application data storage, transactional workflows, complex multi-collection queries, and when you need ACID transactions.

## Summary

Elasticsearch is the superior choice for search-heavy, read-mostly, append-heavy workloads like log analytics. MongoDB is the better fit for general-purpose application databases with mixed CRUD patterns. Many teams run MongoDB as the source of truth and sync data to Elasticsearch for advanced search using tools like Logstash, MongoDB change streams, or Kafka connectors.
