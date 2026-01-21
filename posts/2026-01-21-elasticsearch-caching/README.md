# How to Implement Elasticsearch Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Caching, Performance, Request Cache, Field Data, Query Cache

Description: A comprehensive guide to Elasticsearch caching mechanisms including request cache, field data cache, query cache, and best practices for optimizing cache performance.

---

Caching is crucial for Elasticsearch performance. The right caching strategy can dramatically reduce query latency and cluster load. Elasticsearch provides multiple caching layers, each serving different purposes. This guide covers how to configure and optimize each cache type.

## Elasticsearch Cache Types

Elasticsearch uses several caches:

1. **Node Query Cache**: Caches filter results at the node level
2. **Request Cache**: Caches entire search response at shard level
3. **Field Data Cache**: Caches field values for sorting/aggregations
4. **Segment-level Caches**: Internal caches for segment data

## Node Query Cache

### How It Works

The query cache stores filter results in a bitset. When the same filter runs again, it uses the cached bitset instead of re-evaluating.

### Configuration

```yaml
# elasticsearch.yml
indices.queries.cache.size: 10%
```

```bash
# Check cache stats
curl -X GET "https://localhost:9200/_nodes/stats/indices/query_cache" \
  -u elastic:password
```

### Index-Level Control

```bash
# Disable query cache for specific index
curl -X PUT "https://localhost:9200/logs/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.queries.cache.enabled": false
  }'
```

### What Gets Cached

- Filter clauses in bool queries
- Term queries in filter context
- Range queries in filter context

```bash
# This filter will be cached
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

### Cache Invalidation

Query cache is automatically invalidated when:
- Documents are added, updated, or deleted
- Segments are merged

## Request Cache

### How It Works

Request cache stores the entire response of search requests at the shard level. It is ideal for aggregation-heavy dashboards.

### Enable Request Cache

```bash
# Enable per request
curl -X GET "https://localhost:9200/products/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "categories": {
        "terms": { "field": "category.keyword" }
      }
    }
  }'
```

### Index-Level Configuration

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.requests.cache.enable": true
  }'
```

### Global Configuration

```yaml
# elasticsearch.yml
indices.requests.cache.size: 2%
```

### Cache Key

The cache key includes:
- Query content
- Aggregations
- Suggestions
- Size, from
- Sort
- Source filtering

**Note**: Queries with `now` expressions bypass the cache unless rounded.

### Rounding now for Caching

```bash
# Bad: now prevents caching
curl -X GET "https://localhost:9200/logs/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "range": {
        "timestamp": {
          "gte": "now-1h"
        }
      }
    }
  }'

# Good: Rounded now allows caching
curl -X GET "https://localhost:9200/logs/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "range": {
        "timestamp": {
          "gte": "now-1h/m"
        }
      }
    }
  }'
```

### Check Request Cache Stats

```bash
curl -X GET "https://localhost:9200/_nodes/stats/indices/request_cache" \
  -u elastic:password

curl -X GET "https://localhost:9200/products/_stats/request_cache" \
  -u elastic:password
```

### Clear Request Cache

```bash
# Clear for specific index
curl -X POST "https://localhost:9200/products/_cache/clear?request=true" \
  -u elastic:password

# Clear for all indices
curl -X POST "https://localhost:9200/_cache/clear?request=true" \
  -u elastic:password
```

## Field Data Cache

### How It Works

Field data cache loads field values into memory for:
- Sorting on text fields
- Aggregations on text fields
- Scripted field access

**Important**: Text fields require fielddata enabled, which is memory intensive.

### Enable Fielddata (Not Recommended)

```bash
curl -X PUT "https://localhost:9200/products/_mapping" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "properties": {
      "description": {
        "type": "text",
        "fielddata": true,
        "fielddata_frequency_filter": {
          "min": 0.01,
          "max": 0.9,
          "min_segment_size": 500
        }
      }
    }
  }'
```

### Better Alternative: Keyword Fields

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword"
            }
          }
        }
      }
    }
  }'

# Use keyword field for aggregations
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "names": {
        "terms": { "field": "name.keyword" }
      }
    }
  }'
```

### Configure Fielddata Cache

```yaml
# elasticsearch.yml
indices.fielddata.cache.size: 30%
```

### Monitor Fielddata Usage

```bash
# Node-level stats
curl -X GET "https://localhost:9200/_nodes/stats/indices/fielddata" \
  -u elastic:password

# Per-field breakdown
curl -X GET "https://localhost:9200/_nodes/stats/indices/fielddata?fields=*" \
  -u elastic:password
```

### Clear Fielddata Cache

```bash
curl -X POST "https://localhost:9200/products/_cache/clear?fielddata=true" \
  -u elastic:password
```

## Shard-Level Request Cache Best Practices

### Design for Cacheability

```bash
# Cacheable: Size 0, aggregations only
curl -X GET "https://localhost:9200/products/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "bool": {
        "filter": [
          { "term": { "category": "electronics" } }
        ]
      }
    },
    "aggs": {
      "price_stats": {
        "stats": { "field": "price" }
      }
    }
  }'
```

### Use Consistent Queries

Same query structure = cache hits

```bash
# Query 1
{
  "query": { "term": { "status": "active" } },
  "sort": [{ "created_at": "desc" }]
}

# Query 2 (different, no cache hit)
{
  "sort": [{ "created_at": "desc" }],
  "query": { "term": { "status": "active" } }
}
```

## Caching Strategies

### Dashboard Queries

```bash
# Pre-warm cache with common dashboard queries
curl -X GET "https://localhost:9200/metrics/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "range": {
        "timestamp": {
          "gte": "now-24h/h",
          "lte": "now/h"
        }
      }
    },
    "aggs": {
      "hourly": {
        "date_histogram": {
          "field": "timestamp",
          "calendar_interval": "hour"
        },
        "aggs": {
          "avg_value": { "avg": { "field": "value" } }
        }
      }
    }
  }'
```

### Time-Based Indices

Older indices are stable and cache well:

```bash
# Query current index (less cacheable)
curl -X GET "https://localhost:9200/logs-2024.01.15/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": { "count": { "value_count": { "field": "_id" } } }
  }'

# Query old indices (highly cacheable)
curl -X GET "https://localhost:9200/logs-2024.01.01,logs-2024.01.02/_search?request_cache=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": { "count": { "value_count": { "field": "_id" } } }
  }'
```

## Cache Monitoring

### Comprehensive Cache Stats

```bash
# All cache stats
curl -X GET "https://localhost:9200/_nodes/stats/indices/query_cache,request_cache,fielddata" \
  -u elastic:password

# Index-level cache stats
curl -X GET "https://localhost:9200/products/_stats/query_cache,request_cache,fielddata" \
  -u elastic:password
```

### Important Metrics

- `hit_count`: Cache hits
- `miss_count`: Cache misses
- `evictions`: Items evicted due to size limits
- `memory_size_in_bytes`: Current cache size

### Calculate Hit Rate

```bash
# Query cache hit rate
curl -X GET "https://localhost:9200/_nodes/stats/indices/query_cache" \
  -u elastic:password | jq '
  .nodes | to_entries[] | {
    node: .key,
    hits: .value.indices.query_cache.hit_count,
    misses: .value.indices.query_cache.miss_count,
    hit_rate: (.value.indices.query_cache.hit_count /
              (.value.indices.query_cache.hit_count +
               .value.indices.query_cache.miss_count) * 100)
  }'
```

## Circuit Breakers

Protect against cache-related OOM:

```yaml
# elasticsearch.yml
indices.breaker.fielddata.limit: 40%
indices.breaker.request.limit: 60%
indices.breaker.total.limit: 70%
```

### Monitor Circuit Breakers

```bash
curl -X GET "https://localhost:9200/_nodes/stats/breaker" \
  -u elastic:password
```

## Complete Cache Configuration

```yaml
# elasticsearch.yml

# Query cache (filter results)
indices.queries.cache.size: 10%

# Request cache (search responses)
indices.requests.cache.size: 2%

# Field data cache (sorting/aggregations)
indices.fielddata.cache.size: 30%

# Circuit breakers
indices.breaker.fielddata.limit: 40%
indices.breaker.request.limit: 60%
indices.breaker.total.limit: 70%
```

### Index Settings

```bash
curl -X PUT "https://localhost:9200/products" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index": {
        "queries.cache.enabled": true,
        "requests.cache.enable": true
      }
    },
    "mappings": {
      "properties": {
        "name": {
          "type": "text",
          "fields": {
            "keyword": { "type": "keyword" }
          }
        },
        "category": { "type": "keyword" },
        "price": { "type": "float" },
        "created_at": { "type": "date" }
      }
    }
  }'
```

## Best Practices Summary

1. **Use filter context** for cacheable queries
2. **Round time expressions** (now/h) for request cache
3. **Avoid text fielddata** - use keyword fields instead
4. **Monitor cache metrics** - track hit rates and evictions
5. **Size caches appropriately** - based on workload
6. **Configure circuit breakers** - prevent OOM
7. **Design consistent queries** - same structure for cache hits
8. **Use request cache** for aggregation-heavy workloads
9. **Pre-warm caches** for known query patterns
10. **Clear caches** when data patterns change significantly

## Conclusion

Effective caching in Elasticsearch requires:

1. **Understanding cache types** - query, request, fielddata
2. **Proper configuration** - sizes and limits
3. **Query design** - cacheable patterns
4. **Monitoring** - hit rates and evictions
5. **Circuit breakers** - memory protection

Well-tuned caching can reduce query latency by orders of magnitude and significantly decrease cluster load.
