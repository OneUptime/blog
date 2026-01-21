# How to Reduce Elasticsearch Cluster Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Performance, Optimization, Cluster, Resource Management, Scaling

Description: A comprehensive guide to reducing Elasticsearch cluster load through query optimization, resource management, and architectural best practices for sustainable performance.

---

As data and query volume grow, Elasticsearch clusters can become overloaded. High CPU usage, memory pressure, and slow queries indicate a struggling cluster. This guide covers techniques for reducing load and maintaining healthy cluster performance.

## Identifying Load Issues

### Monitor Cluster Health

```bash
# Basic cluster health
curl -X GET "https://localhost:9200/_cluster/health" \
  -u elastic:password

# Detailed node stats
curl -X GET "https://localhost:9200/_nodes/stats" \
  -u elastic:password

# Hot threads (identify CPU-heavy operations)
curl -X GET "https://localhost:9200/_nodes/hot_threads" \
  -u elastic:password
```

### Key Metrics to Watch

```bash
# CPU and memory
curl -X GET "https://localhost:9200/_nodes/stats/os,jvm" \
  -u elastic:password

# Thread pool rejections
curl -X GET "https://localhost:9200/_cat/thread_pool?v&h=node_name,name,active,queue,rejected" \
  -u elastic:password

# Search and index latency
curl -X GET "https://localhost:9200/_nodes/stats/indices/search,indexing" \
  -u elastic:password
```

## Query Optimization

### 1. Use Filters Instead of Queries

Filters are cached and skip scoring:

```bash
# High load: Query context
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "term": { "status": "active" } },
          { "range": { "price": { "lte": 100 } } }
        ]
      }
    }
  }'

# Lower load: Filter context
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "filter": [
          { "term": { "status": "active" } },
          { "range": { "price": { "lte": 100 } } }
        ]
      }
    }
  }'
```

### 2. Limit Result Size

```bash
# Only fetch what you need
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 10,
    "_source": ["name", "price"],
    "query": { "match": { "name": "laptop" } }
  }'
```

### 3. Avoid Deep Pagination

```bash
# Bad: Deep pagination causes high memory usage
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "from": 50000,
    "size": 10
  }'

# Good: Use search_after
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 10,
    "sort": [{ "created_at": "desc" }, { "_id": "asc" }],
    "search_after": ["2024-01-15T10:00:00", "abc123"]
  }'
```

### 4. Avoid Expensive Queries

```bash
# Expensive: Leading wildcard
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "wildcard": { "name": "*laptop*" } }
  }'

# Expensive: Regex
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "regexp": { "name": ".*laptop.*" } }
  }'

# Better: Full-text search
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "match": { "name": "laptop" } }
  }'
```

### 5. Use Routing

Direct queries to specific shards:

```bash
# Index with routing
curl -X POST "https://localhost:9200/products/_doc?routing=electronics" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{"name": "Laptop", "category": "electronics"}'

# Query with routing (hits only one shard)
curl -X GET "https://localhost:9200/products/_search?routing=electronics" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "term": { "category": "electronics" } }
  }'
```

## Aggregation Optimization

### 1. Reduce Aggregation Scope

```bash
# Filter before aggregating
curl -X GET "https://localhost:9200/logs/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "range": {
        "timestamp": {
          "gte": "now-1h"
        }
      }
    },
    "aggs": {
      "by_status": {
        "terms": { "field": "status" }
      }
    }
  }'
```

### 2. Limit Aggregation Cardinality

```bash
curl -X GET "https://localhost:9200/products/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "top_categories": {
        "terms": {
          "field": "category.keyword",
          "size": 10,
          "shard_size": 25
        }
      }
    }
  }'
```

### 3. Use Composite Aggregations for Large Results

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

### 4. Avoid High-Cardinality Aggregations

```bash
# Bad: Aggregating on high-cardinality field
curl -X GET "https://localhost:9200/logs/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "by_user": {
        "terms": { "field": "user_id", "size": 100000 }
      }
    }
  }'

# Better: Sample first or use approximate counting
curl -X GET "https://localhost:9200/logs/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "aggs": {
      "unique_users": {
        "cardinality": { "field": "user_id" }
      }
    }
  }'
```

## Index Management

### 1. Optimize Shard Count

```bash
# Too many small shards increase overhead
# Aim for 10-50GB per shard

# Check shard sizes
curl -X GET "https://localhost:9200/_cat/shards?v&h=index,shard,prirep,store,node" \
  -u elastic:password
```

### 2. Use Index Lifecycle Management

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/logs_policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_size": "50gb",
              "max_age": "1d"
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "shrink": { "number_of_shards": 1 },
            "forcemerge": { "max_num_segments": 1 }
          }
        },
        "delete": {
          "min_age": "30d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

### 3. Close Unused Indices

```bash
# Close old indices
curl -X POST "https://localhost:9200/logs-2023.*/_close" \
  -u elastic:password

# Or use frozen tier
curl -X PUT "https://localhost:9200/logs-2023.01/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.routing.allocation.include._tier_preference": "data_frozen"
  }'
```

### 4. Force Merge Read-Only Indices

```bash
# Mark as read-only first
curl -X PUT "https://localhost:9200/logs-2024.01.01/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.blocks.write": true
  }'

# Then force merge
curl -X POST "https://localhost:9200/logs-2024.01.01/_forcemerge?max_num_segments=1" \
  -u elastic:password
```

## Resource Management

### 1. Configure Thread Pools

```yaml
# elasticsearch.yml
thread_pool:
  search:
    size: 13
    queue_size: 1000
  write:
    size: 8
    queue_size: 1000
```

### 2. Set Circuit Breakers

```yaml
# elasticsearch.yml
indices.breaker.total.limit: 70%
indices.breaker.fielddata.limit: 40%
indices.breaker.request.limit: 60%
```

### 3. Increase Refresh Interval

```bash
curl -X PUT "https://localhost:9200/logs-*/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.refresh_interval": "30s"
  }'
```

### 4. Enable Request Caching

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.requests.cache.enable": true
  }'
```

## Replica Configuration

### Read Heavy Workloads

Add replicas to distribute search load:

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.number_of_replicas": 2
  }'
```

### Allocate Replicas to Specific Nodes

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.routing.allocation.include.node_type": "search"
  }'
```

## Query Throttling

### Set Max Concurrent Searches

```bash
# Limit concurrent searches per node
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "search.max_concurrent_shard_requests": 5
    }
  }'
```

### Cancel Long-Running Queries

```bash
# List running tasks
curl -X GET "https://localhost:9200/_tasks?detailed=true&actions=*search" \
  -u elastic:password

# Cancel specific task
curl -X POST "https://localhost:9200/_tasks/node_id:task_id/_cancel" \
  -u elastic:password
```

### Set Query Timeout

```bash
curl -X GET "https://localhost:9200/products/_search?timeout=5s" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": { "match_all": {} }
  }'
```

## Architectural Changes

### 1. Use Coordinator Nodes

Dedicated nodes for query coordination:

```yaml
# coordinator node elasticsearch.yml
node.roles: []
```

### 2. Separate Hot and Warm Data

```yaml
# hot node elasticsearch.yml
node.roles: [data_hot, data_content]

# warm node elasticsearch.yml
node.roles: [data_warm]
```

### 3. Use Data Streams

```bash
curl -X PUT "https://localhost:9200/_index_template/logs_template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "data_stream": {},
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 1
      }
    }
  }'

curl -X PUT "https://localhost:9200/_data_stream/logs-app" \
  -u elastic:password
```

## Monitoring and Alerting

### Set Up Monitoring

```bash
# Enable monitoring collection
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "xpack.monitoring.collection.enabled": true
    }
  }'
```

### Key Alerts

- CPU usage > 80%
- Heap usage > 75%
- Thread pool rejections > 0
- Search latency > threshold
- Indexing latency > threshold

## Complete Load Reduction Checklist

```bash
# 1. Check current load
curl -X GET "https://localhost:9200/_cat/nodes?v&h=name,cpu,heap.percent,load_1m" \
  -u elastic:password

# 2. Identify expensive queries
curl -X GET "https://localhost:9200/_nodes/hot_threads" \
  -u elastic:password

# 3. Check thread pool rejections
curl -X GET "https://localhost:9200/_cat/thread_pool?v&h=node_name,name,rejected" \
  -u elastic:password

# 4. Review shard distribution
curl -X GET "https://localhost:9200/_cat/allocation?v" \
  -u elastic:password

# 5. Check cache hit rates
curl -X GET "https://localhost:9200/_nodes/stats/indices/query_cache,request_cache" \
  -u elastic:password

# 6. Enable slow query log
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.search.slowlog.threshold.query.warn": "5s",
    "index.search.slowlog.threshold.query.info": "2s"
  }'
```

## Best Practices Summary

1. **Use filter context** for non-scoring queries
2. **Limit result sizes** - fetch only what you need
3. **Avoid deep pagination** - use search_after
4. **Optimize aggregations** - filter first, limit cardinality
5. **Manage indices** - ILM, force merge, close unused
6. **Configure caching** - request cache, query cache
7. **Set timeouts** - prevent runaway queries
8. **Use routing** - reduce shard fanout
9. **Monitor continuously** - track key metrics
10. **Scale appropriately** - add replicas, coordinator nodes

## Conclusion

Reducing Elasticsearch cluster load requires:

1. **Query optimization** - filters, limits, avoid expensive patterns
2. **Index management** - proper sizing, ILM, force merge
3. **Resource tuning** - thread pools, circuit breakers
4. **Architecture** - coordinator nodes, data tiers
5. **Monitoring** - continuous observation and alerting

Regular optimization keeps your cluster responsive and efficient as data grows.
