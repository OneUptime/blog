# Redis vs Elasticsearch for Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elasticsearch, Search, Full-Text Search, RediSearch

Description: Compare Redis RediSearch and Elasticsearch for full-text search, covering indexing, query language, relevance scoring, and operational complexity.

---

## Overview

Search is a first-class concern in most applications. Elasticsearch has long dominated the search space, but Redis Stack's RediSearch module brings full-text search, secondary indexing, and vector similarity directly to Redis. This post compares the two tools for common search use cases.

## RediSearch Basics

RediSearch adds an index layer on top of Redis hashes and JSON documents.

```bash
# Create an index on hash fields
FT.CREATE idx:products ON HASH PREFIX 1 "product:" \
  SCHEMA name TEXT WEIGHT 2.0 \
         description TEXT \
         price NUMERIC SORTABLE \
         category TAG

# Index some documents
HSET product:1 name "Wireless Mouse" description "Ergonomic wireless mouse" price 29.99 category "electronics"
HSET product:2 name "Mechanical Keyboard" description "RGB backlit mechanical keyboard" price 79.99 category "electronics"

# Search
FT.SEARCH idx:products "wireless keyboard" LIMIT 0 10
```

## Elasticsearch Basics

Elasticsearch indexes JSON documents with dynamic or explicit mappings.

```bash
# Create an index with explicit mapping
curl -X PUT "localhost:9200/products" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "name":        { "type": "text" },
      "description": { "type": "text" },
      "price":       { "type": "float" },
      "category":    { "type": "keyword" }
    }
  }
}'

# Index a document
curl -X POST "localhost:9200/products/_doc/1" -H 'Content-Type: application/json' -d '{
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse",
  "price": 29.99,
  "category": "electronics"
}'

# Search
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d '{
  "query": { "match": { "name": "wireless" } }
}'
```

## Query Language Comparison

### Filters and Range Queries

```bash
# RediSearch: filter by price range and category
FT.SEARCH idx:products "@category:{electronics} @price:[20 100]" \
  SORTBY price ASC LIMIT 0 10

# RediSearch: full-text + numeric filter
FT.SEARCH idx:products "keyboard @price:[50 +inf]"
```

```json
// Elasticsearch: bool query with filter
{
  "query": {
    "bool": {
      "must": { "match": { "name": "keyboard" } },
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 50 } } }
      ]
    }
  }
}
```

### Aggregations

Elasticsearch has a rich aggregation framework:

```json
{
  "aggs": {
    "by_category": {
      "terms": { "field": "category" },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } }
      }
    }
  }
}
```

RediSearch supports grouping and aggregation with `FT.AGGREGATE`:

```bash
FT.AGGREGATE idx:products "*"
  GROUPBY 1 @category
  REDUCE AVG 1 @price AS avg_price
  REDUCE COUNT 0 AS product_count
  SORTBY 2 @avg_price DESC
```

## Relevance Scoring

Elasticsearch uses BM25 by default and supports extensive relevance tuning with `function_score`, `script_score`, and field boosts. RediSearch defaults to TF-IDF scoring but supports BM25 and other scorers, along with field weights and custom scoring via `SCORER`.

```bash
# RediSearch: custom scorer
FT.SEARCH idx:products "mouse" SCORER BM25 WITHSCORES
```

```json
// Elasticsearch: function score for boosting by recency
{
  "query": {
    "function_score": {
      "query": { "match": { "name": "mouse" } },
      "functions": [
        {
          "gauss": {
            "created_at": {
              "origin": "now",
              "scale": "30d",
              "decay": 0.5
            }
          }
        }
      ]
    }
  }
}
```

## Performance

Redis keeps its index in memory, giving sub-millisecond query latency for datasets that fit in RAM. Elasticsearch stores indexes on disk with memory-mapped files, making it suitable for multi-terabyte datasets but with higher latency.

```bash
# RediSearch latency benchmark
redis-benchmark -n 10000 -c 50 \
  FT.SEARCH idx:products wireless LIMIT 0 10
# Typical: 1-3ms p99 latency
```

## Scalability and Operations

Elasticsearch is built for horizontal scaling with shards and replicas. It supports clusters of hundreds of nodes and petabyte-scale indexes. Redis Cluster can distribute RediSearch indexes but with some limitations on cross-shard queries.

## When to Use RediSearch

- Your search dataset fits in memory (under a few GB)
- You need sub-millisecond search latency
- You already run Redis and want to avoid a separate search cluster
- You need simple full-text search combined with real-time data access

## When to Use Elasticsearch

- Your search index is multi-GB or multi-TB
- You need advanced text analysis (language analyzers, stemming, synonyms)
- You need complex aggregations and analytics (Kibana dashboards)
- You need the Elastic ecosystem (APM, security, logging)

## Summary

RediSearch provides fast, low-latency full-text search for datasets that fit in memory, making it ideal for applications already using Redis that need search without operational overhead. Elasticsearch excels at large-scale, complex search with rich analysis pipelines and aggregation capabilities. Choose RediSearch for speed and simplicity; choose Elasticsearch for scale and analytical depth.
