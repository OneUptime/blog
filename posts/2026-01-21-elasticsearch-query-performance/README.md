# How to Optimize Elasticsearch Query Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Query Performance, Optimization, Profiling, Search, Tuning

Description: A comprehensive guide to optimizing Elasticsearch query performance, covering query profiling, query rewriting, filter optimization, and best practices for faster search.

---

Query performance directly impacts user experience and system resources. Slow queries frustrate users and consume cluster resources. Elasticsearch provides tools for profiling and optimizing queries. This guide covers techniques for achieving faster search performance.

## Understanding Query Execution

Elasticsearch queries go through several phases:

1. **Query phase**: Find matching documents and calculate scores
2. **Fetch phase**: Retrieve document content for results
3. **Aggregation phase**: Calculate aggregations if requested

Each phase can be optimized independently.

## Query Profiling

### Profile API

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "profile": true,
    "query": {
      "bool": {
        "must": [
          { "match": { "name": "laptop" } }
        ],
        "filter": [
          { "term": { "category": "electronics" } },
          { "range": { "price": { "gte": 500, "lte": 2000 } } }
        ]
      }
    }
  }'
```

### Interpreting Profile Results

```json
{
  "profile": {
    "shards": [{
      "searches": [{
        "query": [{
          "type": "BooleanQuery",
          "description": "+name:laptop #category:electronics...",
          "time_in_nanos": 1234567,
          "breakdown": {
            "score": 50000,
            "build_scorer": 20000,
            "create_weight": 10000,
            "advance": 5000,
            "match": 100000,
            "next_doc": 80000
          },
          "children": [...]
        }]
      }]
    }]
  }
}
```

Key metrics:
- `time_in_nanos`: Total time for this query component
- `build_scorer`: Time to build scoring iterator
- `match`: Time to match documents
- `next_doc`: Time to advance to next matching doc

### Explain API

Understand why a document matched:

```bash
curl -X GET "https://localhost:9200/products/_explain/1" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "name": "laptop" }
    }
  }'
```

## Filter vs Query Context

### Use Filters for Non-Scoring Queries

Filters are cached and skip scoring:

```bash
# Bad: Using query context for exact match
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "term": { "status": "active" } },
          { "range": { "price": { "gte": 100 } } }
        ]
      }
    }
  }'

# Good: Using filter context
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "filter": [
          { "term": { "status": "active" } },
          { "range": { "price": { "gte": 100 } } }
        ]
      }
    }
  }'
```

### Combine Query and Filter

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "name": "laptop" } }
        ],
        "filter": [
          { "term": { "status": "active" } },
          { "range": { "price": { "gte": 100 } } }
        ]
      }
    }
  }'
```

## Query Optimization Techniques

### 1. Prefer Term Queries Over Match for Keywords

```bash
# Slower: Match query on keyword field
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "category.keyword": "electronics" }
    }
  }'

# Faster: Term query on keyword field
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "term": { "category.keyword": "electronics" }
    }
  }'
```

### 2. Use constant_score for Filters

When you do not need scoring:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "constant_score": {
        "filter": {
          "bool": {
            "must": [
              { "term": { "status": "active" } },
              { "range": { "created_at": { "gte": "2024-01-01" } } }
            ]
          }
        }
      }
    }
  }'
```

### 3. Avoid Leading Wildcards

```bash
# Slow: Leading wildcard
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "wildcard": { "name": "*laptop*" }
    }
  }'

# Better: Use match query
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "name": "laptop" }
    }
  }'

# Alternative: Use n-grams for partial matching
```

### 4. Limit Script Queries

Scripts are expensive:

```bash
# Slow: Script in query
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "script_score": {
        "query": { "match_all": {} },
        "script": {
          "source": "doc[\"price\"].value * doc[\"discount\"].value"
        }
      }
    }
  }'

# Better: Pre-calculate and index the value
```

### 5. Use Query Caching

```bash
curl -X GET "https://localhost:9200/products/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "filter": [
          { "term": { "category": "electronics" } }
        ]
      }
    }
  }'
```

## Pagination Optimization

### Avoid Deep Pagination

```bash
# Slow: Deep pagination with from/size
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "from": 10000,
    "size": 10,
    "query": { "match_all": {} }
  }'
```

### Use search_after for Deep Results

```bash
# First page
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 100,
    "sort": [
      { "created_at": "desc" },
      { "_id": "asc" }
    ],
    "query": { "match_all": {} }
  }'

# Next page (use sort values from last result)
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 100,
    "sort": [
      { "created_at": "desc" },
      { "_id": "asc" }
    ],
    "search_after": ["2024-01-15T10:30:00", "abc123"],
    "query": { "match_all": {} }
  }'
```

### Use Point In Time (PIT) for Consistent Pagination

```bash
# Create PIT
curl -X POST "https://localhost:9200/products/_pit?keep_alive=5m" \
  -u elastic:password

# Search with PIT
curl -X GET "https://localhost:9200/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "pit": {
      "id": "your_pit_id",
      "keep_alive": "5m"
    },
    "size": 100,
    "sort": [
      { "created_at": "desc" },
      { "_id": "asc" }
    ],
    "query": { "match_all": {} }
  }'

# Delete PIT when done
curl -X DELETE "https://localhost:9200/_pit" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{"id": "your_pit_id"}'
```

## Aggregation Optimization

### Use Composite Aggregation for Large Cardinality

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "categories": {
        "composite": {
          "size": 1000,
          "sources": [
            { "category": { "terms": { "field": "category.keyword" } } }
          ]
        }
      }
    }
  }'
```

### Filter Before Aggregating

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "bool": {
        "filter": [
          { "term": { "status": "active" } },
          { "range": { "created_at": { "gte": "2024-01-01" } } }
        ]
      }
    },
    "aggs": {
      "by_category": {
        "terms": { "field": "category.keyword" }
      }
    }
  }'
```

### Use Sampler for Large Datasets

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "sample": {
        "sampler": {
          "shard_size": 1000
        },
        "aggs": {
          "keywords": {
            "significant_terms": {
              "field": "description"
            }
          }
        }
      }
    }
  }'
```

## Source Filtering

### Only Fetch Required Fields

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "_source": ["name", "price", "category"],
    "query": {
      "match": { "name": "laptop" }
    }
  }'

# Or exclude large fields
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "_source": {
      "excludes": ["description", "specifications"]
    },
    "query": {
      "match": { "name": "laptop" }
    }
  }'
```

### Use Stored Fields

For frequently retrieved small fields:

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "_source": false,
    "stored_fields": ["name", "price"],
    "query": {
      "match": { "name": "laptop" }
    }
  }'
```

## Index Settings for Query Performance

### Configure Refresh Interval

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": {
      "refresh_interval": "30s"
    }
  }'
```

### Use Index Sorting

Pre-sort index for common queries:

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index": {
        "sort.field": ["created_at", "category"],
        "sort.order": ["desc", "asc"]
      }
    },
    "mappings": {
      "properties": {
        "created_at": { "type": "date" },
        "category": { "type": "keyword" }
      }
    }
  }'
```

### Optimize Number of Shards

```bash
# For small indices (< 1GB): single shard
curl -X PUT "https://localhost:9200/small_index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 1
    }
  }'

# For larger indices: shards based on data size
# Target: 10-50GB per shard
```

## Slow Query Log

### Configure Slow Log

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.search.slowlog.threshold.query.warn": "10s",
    "index.search.slowlog.threshold.query.info": "5s",
    "index.search.slowlog.threshold.query.debug": "2s",
    "index.search.slowlog.threshold.query.trace": "500ms",
    "index.search.slowlog.threshold.fetch.warn": "1s",
    "index.search.slowlog.threshold.fetch.info": "500ms"
  }'
```

### Analyze Slow Logs

```bash
# View slow log entries
tail -f /var/log/elasticsearch/elasticsearch_index_search_slowlog.json
```

## Complete Optimization Example

```bash
# Optimized search query
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "_source": ["name", "price", "category", "image_url"],
    "size": 20,
    "query": {
      "bool": {
        "must": [
          {
            "multi_match": {
              "query": "laptop",
              "fields": ["name^2", "brand"],
              "type": "best_fields"
            }
          }
        ],
        "filter": [
          { "term": { "status": "active" } },
          { "range": { "price": { "gte": 500, "lte": 2000 } } },
          { "term": { "in_stock": true } }
        ]
      }
    },
    "sort": [
      { "_score": "desc" },
      { "created_at": "desc" }
    ],
    "aggs": {
      "price_ranges": {
        "range": {
          "field": "price",
          "ranges": [
            { "to": 500 },
            { "from": 500, "to": 1000 },
            { "from": 1000, "to": 2000 },
            { "from": 2000 }
          ]
        }
      },
      "brands": {
        "terms": {
          "field": "brand.keyword",
          "size": 10
        }
      }
    },
    "highlight": {
      "fields": {
        "name": { "fragment_size": 100 }
      }
    }
  }'
```

## Best Practices Summary

1. **Use filter context** for non-scoring queries
2. **Avoid deep pagination** - use search_after
3. **Profile slow queries** with Profile API
4. **Fetch only needed fields** with source filtering
5. **Prefer term over match** for keyword fields
6. **Avoid leading wildcards** and heavy scripts
7. **Configure appropriate shard count** for data size
8. **Enable slow query logging** to identify issues
9. **Use composite aggregations** for large cardinality
10. **Pre-sort indices** for common access patterns

## Conclusion

Query performance optimization requires understanding:

1. **Query structure** - filters vs queries, caching
2. **Pagination** - search_after, PIT for deep results
3. **Aggregations** - filtering first, composite for scale
4. **Index settings** - shards, sorting, refresh intervals
5. **Monitoring** - profile API, slow logs

Regular profiling and optimization ensure your search remains fast as data grows.
