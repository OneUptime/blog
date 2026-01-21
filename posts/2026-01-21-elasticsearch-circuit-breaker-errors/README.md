# How to Fix Elasticsearch "Circuit Breaker" Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Circuit Breaker, Memory Management, Troubleshooting, Performance, OOM

Description: A comprehensive guide to understanding and resolving Elasticsearch circuit breaker errors, covering memory management, configuration tuning, and best practices for preventing memory-related issues.

---

Circuit breakers in Elasticsearch protect the cluster from running out of memory by rejecting operations that would use too much memory. This guide covers understanding, diagnosing, and resolving circuit breaker errors.

## Understanding Circuit Breakers

Circuit breakers estimate memory usage before operations execute and reject requests that would exceed configured limits. This prevents OutOfMemoryErrors that could crash nodes.

### Types of Circuit Breakers

| Circuit Breaker | Purpose | Default Limit |
|-----------------|---------|---------------|
| Parent | Total memory for all breakers | 95% of JVM heap |
| Field data | Field data cache | 40% of JVM heap |
| Request | Per-request data structures | 60% of JVM heap |
| In-flight requests | Transport-level requests | 100% of JVM heap |
| Accounting | Memory held by Lucene | 100% of JVM heap |

## Identifying Circuit Breaker Errors

### Common Error Messages

```
[parent] Data too large, data for [<operation>] would be [xxx/xxxgb], which is larger than the limit of [xxx/xxxgb]

CircuitBreakingException: [request] Data too large, data for [<agg>] would be [xxxmb], which is larger than the limit of [xxxmb]

[fielddata] Data too large, data for [field] would be [xxxmb], which is larger than the limit of [xxxmb]
```

### Check Circuit Breaker Statistics

```bash
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/breaker?pretty"
```

Response:

```json
{
  "nodes": {
    "node-1": {
      "breakers": {
        "request": {
          "limit_size_in_bytes": 6442450944,
          "limit_size": "6gb",
          "estimated_size_in_bytes": 1073741824,
          "estimated_size": "1gb",
          "overhead": 1.0,
          "tripped": 5
        },
        "fielddata": {
          "limit_size_in_bytes": 4294967296,
          "limit_size": "4gb",
          "estimated_size_in_bytes": 2147483648,
          "estimated_size": "2gb",
          "overhead": 1.03,
          "tripped": 2
        },
        "parent": {
          "limit_size_in_bytes": 9663676416,
          "limit_size": "9gb",
          "estimated_size_in_bytes": 5368709120,
          "estimated_size": "5gb",
          "overhead": 1.0,
          "tripped": 10
        }
      }
    }
  }
}
```

### Monitor Memory Usage

```bash
# JVM memory stats
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/jvm?pretty"

# Field data cache stats
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/indices/fielddata?pretty"

# Request cache stats
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/indices/request_cache?pretty"
```

## Common Causes and Solutions

### 1. High-Cardinality Field Data

Field data is loaded into memory for sorting and aggregations on text fields.

**Symptoms:**
- Fielddata circuit breaker tripped
- High fielddata cache usage

**Diagnosis:**

```bash
# Check field data usage per field
curl -u elastic:password -X GET "localhost:9200/_cat/fielddata?v&fields=*"

# Check per-index field data
curl -u elastic:password -X GET "localhost:9200/_stats/fielddata?pretty"
```

**Solutions:**

Use keyword fields instead of text for aggregations:
```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_mapping" -H 'Content-Type: application/json' -d'
{
  "properties": {
    "status": {
      "type": "keyword"
    }
  }
}'
```

Clear field data cache:
```bash
curl -u elastic:password -X POST "localhost:9200/_cache/clear?fielddata=true"
```

Limit field data cache:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "indices.fielddata.cache.size": "20%"
  }
}'
```

### 2. Large Aggregations

**Symptoms:**
- Request circuit breaker tripped during aggregation queries
- Queries with many buckets

**Diagnosis:**

Check the failing query in logs or reproduce:
```bash
# Profile a query to see memory usage
curl -u elastic:password -X GET "localhost:9200/my-index/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "profile": true,
  "size": 0,
  "aggs": {
    "large_agg": {
      "terms": {
        "field": "user_id.keyword",
        "size": 100000
      }
    }
  }
}'
```

**Solutions:**

Reduce bucket size:
```json
{
  "aggs": {
    "users": {
      "terms": {
        "field": "user_id.keyword",
        "size": 1000
      }
    }
  }
}
```

Use composite aggregation for large datasets:
```json
{
  "size": 0,
  "aggs": {
    "users": {
      "composite": {
        "size": 1000,
        "sources": [
          {"user": {"terms": {"field": "user_id.keyword"}}}
        ]
      }
    }
  }
}
```

Use shard_size for better accuracy with fewer buckets:
```json
{
  "aggs": {
    "users": {
      "terms": {
        "field": "user_id.keyword",
        "size": 100,
        "shard_size": 500
      }
    }
  }
}
```

### 3. Large Bulk Requests

**Symptoms:**
- In-flight requests circuit breaker tripped
- Errors during bulk indexing

**Solutions:**

Reduce bulk request size:
```bash
# Instead of 10000 docs per bulk
# Use 1000-5000 docs per bulk
curl -u elastic:password -X POST "localhost:9200/_bulk" -H 'Content-Type: application/x-ndjson' --data-binary @bulk-small.json
```

Configure bulk thread pool:
```yaml
# elasticsearch.yml
thread_pool.write.queue_size: 1000
```

### 4. Insufficient JVM Heap

**Symptoms:**
- Frequent circuit breaker trips
- Parent breaker consistently at limit

**Solutions:**

Increase JVM heap (max 50% of RAM, not exceeding 31GB):
```bash
# /etc/elasticsearch/jvm.options
-Xms16g
-Xmx16g
```

Verify settings:
```bash
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/jvm?pretty" | jq '.nodes[].jvm.mem'
```

## Configuring Circuit Breakers

### Adjust Circuit Breaker Limits

```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "indices.breaker.total.limit": "95%",
    "indices.breaker.fielddata.limit": "40%",
    "indices.breaker.request.limit": "60%"
  }
}'
```

### Field Data Circuit Breaker

```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "indices.breaker.fielddata.limit": "30%",
    "indices.breaker.fielddata.overhead": "1.03"
  }
}'
```

### Request Circuit Breaker

```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "indices.breaker.request.limit": "50%",
    "indices.breaker.request.overhead": "1.0"
  }
}'
```

### Network Circuit Breaker

```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "network.breaker.inflight_requests.limit": "100%",
    "network.breaker.inflight_requests.overhead": "2.0"
  }
}'
```

## Query Optimization

### Use Doc Values Instead of Field Data

Doc values are stored on disk and don't use heap memory:
```bash
curl -u elastic:password -X PUT "localhost:9200/my-index" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "status": {
        "type": "keyword"
      },
      "count": {
        "type": "integer"
      }
    }
  }
}'
```

### Disable Field Data on Text Fields

```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_mapping" -H 'Content-Type: application/json' -d'
{
  "properties": {
    "description": {
      "type": "text",
      "fielddata": false
    }
  }
}'
```

### Use Filters Instead of Queries

Filters are cached and don't contribute to scoring:
```json
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"status": "active"}},
        {"range": {"date": {"gte": "2024-01-01"}}}
      ]
    }
  }
}
```

### Limit Result Set Size

```json
{
  "size": 100,
  "query": {
    "match_all": {}
  },
  "track_total_hits": false
}
```

## Monitoring and Alerting

### Set Up Circuit Breaker Monitoring

Using Elasticsearch Watcher:
```bash
curl -u elastic:password -X PUT "localhost:9200/_watcher/watch/circuit-breaker-alert" -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "http": {
      "request": {
        "host": "localhost",
        "port": 9200,
        "path": "/_nodes/stats/breaker",
        "auth": {
          "basic": {
            "username": "elastic",
            "password": "password"
          }
        }
      }
    }
  },
  "condition": {
    "script": {
      "source": "def nodes = ctx.payload.nodes; for (node in nodes.values()) { if (node.breakers.parent.tripped > 0) return true; } return false;"
    }
  },
  "actions": {
    "notify": {
      "webhook": {
        "method": "POST",
        "url": "https://hooks.slack.com/services/xxx",
        "body": "Circuit breaker tripped in Elasticsearch cluster"
      }
    }
  }
}'
```

### Key Metrics to Monitor

```bash
# Script to check circuit breaker health
curl -s -u elastic:password "localhost:9200/_nodes/stats/breaker" | jq '
  .nodes | to_entries[] | {
    node: .key,
    parent_used_pct: ((.value.breakers.parent.estimated_size_in_bytes / .value.breakers.parent.limit_size_in_bytes) * 100 | floor),
    fielddata_used_pct: ((.value.breakers.fielddata.estimated_size_in_bytes / .value.breakers.fielddata.limit_size_in_bytes) * 100 | floor),
    request_used_pct: ((.value.breakers.request.estimated_size_in_bytes / .value.breakers.request.limit_size_in_bytes) * 100 | floor),
    total_tripped: (.value.breakers.parent.tripped + .value.breakers.fielddata.tripped + .value.breakers.request.tripped)
  }'
```

## Emergency Procedures

### When Circuit Breakers Keep Tripping

1. **Identify the source**:
```bash
# Check which breaker is tripping
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/breaker?pretty"
```

2. **Clear caches if fielddata is the issue**:
```bash
curl -u elastic:password -X POST "localhost:9200/_cache/clear"
```

3. **Temporarily increase limits**:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "indices.breaker.total.limit": "98%"
  }
}'
```

4. **Kill expensive queries**:
```bash
# List running tasks
curl -u elastic:password -X GET "localhost:9200/_tasks?detailed=true&group_by=parents"

# Cancel a specific task
curl -u elastic:password -X POST "localhost:9200/_tasks/task-id/_cancel"
```

## Best Practices

### 1. Right-Size JVM Heap

- Set to 50% of available RAM
- Never exceed 31GB (compressed OOPs limit)
- Leave memory for OS file cache

### 2. Use Appropriate Field Types

- Use `keyword` for aggregations, not `text`
- Disable `fielddata` on text fields
- Use `doc_values` (enabled by default)

### 3. Design Efficient Queries

- Use filters where possible
- Limit aggregation bucket counts
- Use composite aggregations for large cardinality
- Set appropriate `size` limits

### 4. Monitor Continuously

- Track circuit breaker trips
- Monitor heap usage
- Alert on approaching limits

### 5. Test at Scale

- Load test with production-like data
- Test worst-case queries
- Validate circuit breaker settings

## Summary

Circuit breaker errors indicate memory pressure in Elasticsearch. Resolution involves:

1. **Identify the breaker type** - fielddata, request, or parent
2. **Find the root cause** - high-cardinality fields, large aggregations, insufficient heap
3. **Apply targeted fixes** - optimize queries, adjust mappings, tune settings
4. **Monitor continuously** - track metrics and set up alerts
5. **Prevent recurrence** - follow best practices for memory management

With proper configuration and query optimization, circuit breaker errors can be minimized while protecting cluster stability.
