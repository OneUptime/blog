# RediSearch vs Elasticsearch: Search Engine Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RediSearch, Elasticsearch, Full-Text Search, Search Engine, Performance

Description: A detailed comparison of RediSearch and Elasticsearch covering indexing, analyzers, aggregations, performance, and operational overhead.

---

## Overview

RediSearch (part of Redis Stack) and Elasticsearch are both full-featured search engines with full-text indexing, filtering, and aggregation capabilities. RediSearch stores indexes entirely in RAM for sub-millisecond latency, while Elasticsearch uses disk-based inverted indexes with memory mapping. This post dives into the differences.

## Index Creation

### RediSearch

```bash
# Create an index on hash documents
FT.CREATE idx:articles ON HASH PREFIX 1 "article:" \
  SCHEMA \
    title    TEXT WEIGHT 3.0 NOSTEM \
    body     TEXT \
    author   TAG SORTABLE \
    tags     TAG SEPARATOR "," \
    views    NUMERIC SORTABLE \
    created  NUMERIC SORTABLE

# Create an index on JSON documents
FT.CREATE idx:articles_json ON JSON PREFIX 1 "article:" \
  SCHEMA \
    $.title  AS title  TEXT WEIGHT 3.0 \
    $.body   AS body   TEXT \
    $.author AS author TAG SORTABLE \
    $.views  AS views  NUMERIC SORTABLE
```

### Elasticsearch

```bash
curl -X PUT "localhost:9200/articles" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "title":   { "type": "text" },
      "body":    { "type": "text" },
      "author":  { "type": "keyword" },
      "tags":    { "type": "keyword" },
      "views":   { "type": "long" },
      "created": { "type": "date" }
    }
  },
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}'
```

## Search Query Comparison

### Basic Text Search

```bash
# RediSearch
FT.SEARCH idx:articles "redis streams" LIMIT 0 10 WITHSCORES

# Elasticsearch
curl -X GET "localhost:9200/articles/_search" -H 'Content-Type: application/json' -d '{
  "query": { "match": { "body": "redis streams" } },
  "from": 0, "size": 10,
  "_source": ["title", "author", "views"]
}'
```

### Filtered Search with Sort

```bash
# RediSearch: text + tag + numeric filter
FT.SEARCH idx:articles "@author:{alice} @tags:{redis} @views:[100 +inf]" \
  SORTBY views DESC LIMIT 0 10

# Elasticsearch
curl -X GET "localhost:9200/articles/_search" -H 'Content-Type: application/json' -d '{
  "query": {
    "bool": {
      "must":   [{ "match": { "body": "redis" } }],
      "filter": [
        { "term":  { "author": "alice" } },
        { "range": { "views": { "gte": 100 } } }
      ]
    }
  },
  "sort": [{ "views": "desc" }]
}'
```

### Fuzzy and Prefix Search

```bash
# RediSearch: fuzzy matching (Levenshtein distance)
FT.SEARCH idx:articles "%reddis%" LIMIT 0 10   # distance=1
FT.SEARCH idx:articles "%%reddiss%%" LIMIT 0 10 # distance=2

# RediSearch: prefix search
FT.SEARCH idx:articles "redis*" LIMIT 0 10

# Elasticsearch: fuzzy query
{
  "query": { "fuzzy": { "body": { "value": "reddis", "fuzziness": 1 } } }
}

# Elasticsearch: prefix query
{
  "query": { "prefix": { "title": "redis" } }
}
```

## Aggregations

### RediSearch Aggregations

```bash
FT.AGGREGATE idx:articles "*"
  GROUPBY 1 @author
  REDUCE COUNT 0 AS article_count
  REDUCE SUM 1 @views AS total_views
  SORTBY 2 @total_views DESC
  LIMIT 0 10
```

```bash
# Histogram by creation date (bucket by day)
FT.AGGREGATE idx:articles "@created:[1711900800 +inf]"
  APPLY "@created - (@created % 86400)" AS day
  GROUPBY 1 @day
  REDUCE COUNT 0 AS posts_per_day
  SORTBY 2 @day ASC
```

### Elasticsearch Aggregations

```json
{
  "aggs": {
    "by_author": {
      "terms": { "field": "author", "size": 10 },
      "aggs": {
        "total_views": { "sum": { "field": "views" } }
      }
    }
  }
}
```

## Text Analysis

Elasticsearch has more advanced text analysis with custom analyzers, language-specific tokenizers, and synonym support:

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "english_stop", "english_stemmer", "my_synonyms"]
        }
      },
      "filter": {
        "english_stop": { "type": "stop", "stopwords": "_english_" },
        "my_synonyms": {
          "type": "synonym",
          "synonyms": ["redis, redis db", "elastic, elasticsearch"]
        },
        "english_stemmer": { "type": "stemmer", "language": "english" }
      }
    }
  }
}
```

RediSearch supports stemming and stopwords but with fewer built-in options:

```bash
# Create index with language-specific stemming
FT.CREATE idx:en ON HASH PREFIX 1 "doc:" \
  LANGUAGE english \
  LANGUAGE_FIELD lang \
  SCHEMA body TEXT
```

## Operational Comparison

```text
Aspect               | RediSearch              | Elasticsearch
---------------------|-------------------------|---------------------------
Index storage        | In-memory (RAM)         | Disk (memory-mapped)
Dataset limit        | Available RAM           | Petabyte scale
Cluster setup        | Redis Cluster           | ES shards and replicas
Minimum deployment   | Single Redis instance   | Single node or 3-node cluster
Monitoring           | Redis INFO, SLOWLOG     | Kibana, ES API
Schema updates       | Drop/recreate index     | Dynamic mapping updates
```

## Performance Benchmarks

RediSearch benchmarks typically show sub-millisecond latency for cached datasets:

```bash
# RediSearch benchmark
redis-benchmark -n 50000 -c 20 \
  FT.SEARCH idx:articles "redis" LIMIT 0 10
# p99: 1-3ms for ~1M documents in memory
```

Elasticsearch is optimized for larger datasets with slightly higher per-query latency:

```bash
# Elasticsearch benchmark via wrk
wrk -t4 -c20 -d30s -s search.lua http://localhost:9200
# p99: 5-20ms for typical workloads
```

## When to Use RediSearch

- Search dataset fits in RAM (up to a few hundred GB)
- You need sub-millisecond search latency
- You already run Redis and want search without a new service
- Simple full-text search with filtering is sufficient

## When to Use Elasticsearch

- Search index is multi-GB or multi-TB (exceeds RAM)
- You need advanced text analysis, custom analyzers, and synonyms
- You need Kibana dashboards, APM, and the broader Elastic Stack
- You need complex nested aggregations and analytics pipelines

## Summary

RediSearch delivers blazing sub-millisecond search latency for datasets that fit in memory, making it ideal for applications already using Redis that need search without adding operational complexity. Elasticsearch excels at large-scale search with rich text analysis, advanced aggregations, and the full Elastic ecosystem. Choose RediSearch for speed and simplicity at moderate scale; choose Elasticsearch when dataset size, text analysis depth, or analytics complexity demands it.
