# How to Troubleshoot Elasticsearch Slow Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Slow Queries, Query Optimization, Performance, Profiling, Troubleshooting

Description: A comprehensive guide to troubleshooting slow Elasticsearch queries, covering query profiling, slow log analysis, common performance issues, and optimization techniques.

---

Slow queries in Elasticsearch can significantly impact application performance and user experience. This guide covers systematic approaches to identifying, analyzing, and optimizing slow queries.

## Enabling Slow Logs

### Index-Level Slow Log Configuration

```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s",
  "index.search.slowlog.threshold.query.debug": "2s",
  "index.search.slowlog.threshold.query.trace": "500ms",
  "index.search.slowlog.threshold.fetch.warn": "1s",
  "index.search.slowlog.threshold.fetch.info": "800ms",
  "index.search.slowlog.threshold.fetch.debug": "500ms",
  "index.search.slowlog.threshold.fetch.trace": "200ms"
}'
```

### Cluster-Level Default Configuration

```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "index.search.slowlog.threshold.query.warn": "10s",
    "index.search.slowlog.threshold.query.info": "5s"
  }
}'
```

### Include Source in Slow Logs

```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "index.search.slowlog.source": "1000"
}'
```

## Reading Slow Logs

### Log Location

Default location: `$ES_HOME/logs/<cluster_name>_index_search_slowlog.json`

### Sample Slow Log Entry

```json
{
  "@timestamp": "2024-01-21T10:30:00.000Z",
  "level": "WARN",
  "component": "i.s.s.query",
  "cluster.name": "production",
  "node.name": "node-1",
  "message": "[my-index][0]",
  "took": "15.2s",
  "took_millis": 15200,
  "total_hits": "10000 hits",
  "stats": [],
  "search_type": "QUERY_THEN_FETCH",
  "total_shards": 5,
  "source": "{\"query\":{\"match\":{\"message\":\"error\"}}}"
}
```

### Parse Slow Logs

```bash
# Find slowest queries
cat elasticsearch_index_search_slowlog.json | jq -s 'sort_by(.took_millis) | reverse | .[0:10] | .[] | {took: .took, source: .source}'

# Count queries by index
cat elasticsearch_index_search_slowlog.json | jq -r '.message' | sort | uniq -c | sort -rn
```

## Query Profiling

### Enable Profile API

```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "profile": true,
  "query": {
    "match": {
      "message": "error"
    }
  }
}'
```

### Profile Response Analysis

```json
{
  "profile": {
    "shards": [
      {
        "id": "[node-1][my-index][0]",
        "searches": [
          {
            "query": [
              {
                "type": "BooleanQuery",
                "description": "message:error",
                "time_in_nanos": 5234567,
                "breakdown": {
                  "score": 1234567,
                  "build_scorer_count": 1,
                  "match_count": 10000,
                  "create_weight": 234567,
                  "next_doc": 2345678,
                  "advance": 123456
                }
              }
            ],
            "collector": [
              {
                "name": "SimpleTopScoreDocCollector",
                "time_in_nanos": 987654
              }
            ]
          }
        ],
        "aggregations": []
      }
    ]
  }
}
```

### Key Profile Metrics

| Metric | Description |
|--------|-------------|
| time_in_nanos | Total time for this query component |
| score | Time spent scoring documents |
| build_scorer | Time building scoring structure |
| next_doc | Time advancing to next document |
| advance | Time skipping to document |
| match | Time checking matches |

## Common Slow Query Patterns

### 1. Wildcard Queries on Large Fields

**Problem:**
```json
{
  "query": {
    "wildcard": {
      "message": "*error*"
    }
  }
}
```

**Solution:** Use match query with ngram analyzer or dedicated search field:
```json
{
  "query": {
    "match": {
      "message": "error"
    }
  }
}
```

### 2. Script Queries

**Problem:**
```json
{
  "query": {
    "script": {
      "script": {
        "source": "doc['field'].value.length() > 10"
      }
    }
  }
}
```

**Solution:** Pre-compute values at index time:
```json
{
  "mappings": {
    "properties": {
      "field_length": {
        "type": "integer"
      }
    }
  }
}
```

### 3. Deep Pagination

**Problem:**
```json
{
  "from": 10000,
  "size": 100,
  "query": {
    "match_all": {}
  }
}
```

**Solution:** Use search_after for deep pagination:
```json
{
  "size": 100,
  "query": {
    "match_all": {}
  },
  "sort": [
    {"@timestamp": "desc"},
    {"_id": "desc"}
  ],
  "search_after": ["2024-01-21T10:30:00.000Z", "doc-id-123"]
}
```

### 4. High-Cardinality Aggregations

**Problem:**
```json
{
  "size": 0,
  "aggs": {
    "unique_users": {
      "terms": {
        "field": "user_id.keyword",
        "size": 1000000
      }
    }
  }
}
```

**Solution:** Use composite aggregation or limit size:
```json
{
  "size": 0,
  "aggs": {
    "unique_users": {
      "composite": {
        "size": 10000,
        "sources": [
          {"user": {"terms": {"field": "user_id.keyword"}}}
        ]
      }
    }
  }
}
```

### 5. Expensive Boolean Queries

**Problem:**
```json
{
  "query": {
    "bool": {
      "should": [
        {"match": {"field1": "value"}},
        {"match": {"field2": "value"}},
        {"match": {"field3": "value"}}
      ],
      "minimum_should_match": 1
    }
  }
}
```

**Solution:** Use filters for non-scoring clauses:
```json
{
  "query": {
    "bool": {
      "filter": [
        {
          "bool": {
            "should": [
              {"term": {"field1.keyword": "value"}},
              {"term": {"field2.keyword": "value"}}
            ]
          }
        }
      ]
    }
  }
}
```

## Query Optimization Techniques

### Use Query Caching

```json
{
  "query": {
    "bool": {
      "filter": [
        {"term": {"status": "active"}}
      ]
    }
  }
}
```

Filters are cached by default.

### Limit Fields Retrieved

```json
{
  "query": {
    "match": {"message": "error"}
  },
  "_source": ["@timestamp", "message", "level"],
  "size": 100
}
```

### Use Stored Fields

```json
{
  "query": {
    "match": {"message": "error"}
  },
  "stored_fields": ["@timestamp", "level"],
  "_source": false
}
```

### Prefer Term Queries for Exact Matches

```json
{
  "query": {
    "term": {
      "status.keyword": "active"
    }
  }
}
```

### Use Request Cache for Aggregations

```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_search?request_cache=true" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "daily_count": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "day"
      }
    }
  }
}'
```

## Index Optimization

### Check Index Health

```bash
curl -u elastic:password -X GET "localhost:9200/_cat/indices/my-index?v&h=index,health,pri,rep,docs.count,store.size,pri.store.size"
```

### Force Merge for Read-Only Indices

```bash
curl -u elastic:password -X POST "localhost:9200/my-index/_forcemerge?max_num_segments=1"
```

### Refresh Interval Optimization

For write-heavy indices, increase refresh interval:
```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "index.refresh_interval": "30s"
}'
```

### Check Shard Allocation

```bash
# Shard distribution
curl -u elastic:password -X GET "localhost:9200/_cat/shards/my-index?v&s=store:desc"

# Hot threads
curl -u elastic:password -X GET "localhost:9200/_nodes/hot_threads"
```

## Analyzing Query Performance

### Search Stats

```bash
curl -u elastic:password -X GET "localhost:9200/_stats/search?pretty"
```

### Index Stats

```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_stats?pretty"
```

### Task Management

```bash
# List running queries
curl -u elastic:password -X GET "localhost:9200/_tasks?detailed=true&actions=*search*"

# Cancel slow query
curl -u elastic:password -X POST "localhost:9200/_tasks/task-id/_cancel"
```

## Query Best Practices Checklist

1. **Use keyword fields** for filtering and aggregations
2. **Avoid wildcard prefixes** like `*error`
3. **Use filters** for non-scoring conditions
4. **Limit result size** - don't fetch more than needed
5. **Use search_after** instead of deep pagination
6. **Limit aggregation cardinality** - use composite aggregations
7. **Enable request caching** for repeated aggregations
8. **Profile slow queries** to understand bottlenecks
9. **Monitor slow logs** regularly
10. **Force merge** read-only indices

## Monitoring Dashboard

Key metrics to track:

```bash
# Query latency percentiles
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/indices/search?pretty" | jq '.nodes[].indices.search'

# Cache hit rates
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/indices/query_cache,request_cache?pretty"
```

## Summary

Troubleshooting slow Elasticsearch queries requires:

1. **Enable slow logs** to capture problematic queries
2. **Use profile API** to understand query execution
3. **Identify patterns** - wildcards, scripts, deep pagination
4. **Optimize queries** - use filters, limit results, appropriate types
5. **Optimize indices** - force merge, proper mapping
6. **Monitor continuously** - track latency and cache hit rates

With systematic analysis and optimization, most slow queries can be improved significantly.
