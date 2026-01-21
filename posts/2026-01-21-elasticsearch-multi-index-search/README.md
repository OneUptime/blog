# How to Search Across Multiple Indices in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Multi-Index Search, Cross-Index, Search, Queries

Description: A comprehensive guide to searching across multiple Elasticsearch indices, covering index patterns, cross-cluster search, field handling, and best practices for unified search.

---

Searching across multiple indices is common in Elasticsearch, whether querying time-based indices, separate data types, or federated clusters. This guide covers techniques for effective multi-index search.

## Basic Multi-Index Search

### Comma-Separated Indices

```bash
curl -X GET "https://localhost:9200/logs-2024.01,logs-2024.02,logs-2024.03/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "error" }
    }
  }'
```

### Wildcard Patterns

```bash
# All logs indices
curl -X GET "https://localhost:9200/logs-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "error" }
    }
  }'

# Multiple patterns
curl -X GET "https://localhost:9200/logs-*,metrics-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_all": {}
    }
  }'
```

### Exclude Indices

```bash
curl -X GET "https://localhost:9200/logs-*,-logs-debug-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_all": {}
    }
  }'
```

### All Indices

```bash
curl -X GET "https://localhost:9200/_all/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "critical" }
    }
  }'

# Or use wildcard
curl -X GET "https://localhost:9200/*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "critical" }
    }
  }'
```

## Using Index Aliases

Create an alias spanning multiple indices:

```bash
# Create alias for all logs
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "add": { "index": "logs-2024.01", "alias": "logs-all" } },
      { "add": { "index": "logs-2024.02", "alias": "logs-all" } },
      { "add": { "index": "logs-2024.03", "alias": "logs-all" } }
    ]
  }'

# Search using alias
curl -X GET "https://localhost:9200/logs-all/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "error" }
    }
  }'
```

## Handling Different Mappings

### Field Existence Check

```bash
curl -X GET "https://localhost:9200/logs-*,metrics-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "bool": {
        "should": [
          {
            "bool": {
              "must": [
                { "exists": { "field": "message" } },
                { "match": { "message": "error" } }
              ]
            }
          },
          {
            "bool": {
              "must": [
                { "exists": { "field": "metric_name" } },
                { "term": { "metric_name": "cpu_usage" } }
              ]
            }
          }
        ]
      }
    }
  }'
```

### Type Coercion Settings

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "search.allow_expensive_queries": true
    }
  }'
```

## Index Boost

Prioritize certain indices in scoring:

```bash
curl -X GET "https://localhost:9200/products-featured,products-regular/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices_boost": [
      { "products-featured": 2.0 },
      { "products-regular": 1.0 }
    ],
    "query": {
      "match": { "name": "laptop" }
    }
  }'
```

## Routing for Performance

Target specific shards:

```bash
curl -X GET "https://localhost:9200/logs-*/_search?routing=user123" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "term": { "user_id": "user123" }
    }
  }'
```

## Cross-Cluster Search

Search across remote clusters:

### Configure Remote Cluster

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.remote.cluster_west": {
        "seeds": ["west-node1:9300", "west-node2:9300"]
      },
      "cluster.remote.cluster_east": {
        "seeds": ["east-node1:9300", "east-node2:9300"]
      }
    }
  }'
```

### Search Remote Clusters

```bash
# Search single remote cluster
curl -X GET "https://localhost:9200/cluster_west:logs-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "error" }
    }
  }'

# Search multiple clusters including local
curl -X GET "https://localhost:9200/logs-*,cluster_west:logs-*,cluster_east:logs-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "error" }
    }
  }'
```

### Cross-Cluster Search Options

```bash
curl -X GET "https://localhost:9200/logs-*,cluster_west:logs-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "message": "error" }
    },
    "ccs_minimize_roundtrips": true
  }'
```

## Aggregations Across Indices

```bash
curl -X GET "https://localhost:9200/logs-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "size": 0,
    "query": {
      "range": {
        "@timestamp": {
          "gte": "2024-01-01",
          "lt": "2024-04-01"
        }
      }
    },
    "aggs": {
      "by_index": {
        "terms": {
          "field": "_index",
          "size": 100
        },
        "aggs": {
          "error_count": {
            "filter": {
              "term": { "level": "error" }
            }
          }
        }
      },
      "daily_errors": {
        "date_histogram": {
          "field": "@timestamp",
          "calendar_interval": "day"
        },
        "aggs": {
          "error_count": {
            "filter": {
              "term": { "level": "error" }
            }
          }
        }
      }
    }
  }'
```

## Sorting Across Indices

Handle missing fields when sorting:

```bash
curl -X GET "https://localhost:9200/articles-*,news-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match": { "content": "technology" }
    },
    "sort": [
      {
        "publish_date": {
          "order": "desc",
          "unmapped_type": "date",
          "missing": "_last"
        }
      }
    ]
  }'
```

## Search Template for Multi-Index

Create reusable search templates:

```bash
# Store template
curl -X PUT "https://localhost:9200/_scripts/multi_index_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "script": {
      "lang": "mustache",
      "source": {
        "query": {
          "bool": {
            "must": [
              { "match": { "{{field}}": "{{query}}" } }
            ],
            "filter": [
              { "range": { "@timestamp": { "gte": "{{from}}", "lt": "{{to}}" } } }
            ]
          }
        }
      }
    }
  }'

# Use template
curl -X GET "https://localhost:9200/logs-*/_search/template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "id": "multi_index_search",
    "params": {
      "field": "message",
      "query": "error",
      "from": "2024-01-01",
      "to": "2024-02-01"
    }
  }'
```

## Handling Missing Indices

### Ignore Unavailable

```bash
curl -X GET "https://localhost:9200/logs-*/_search?ignore_unavailable=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_all": {}
    }
  }'
```

### Allow No Indices

```bash
curl -X GET "https://localhost:9200/logs-2024.12.*/_search?allow_no_indices=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_all": {}
    }
  }'
```

### Expand Wildcards

```bash
curl -X GET "https://localhost:9200/logs-*/_search?expand_wildcards=open,hidden" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_all": {}
    }
  }'
```

## Complete Example: Unified Search

```bash
curl -X GET "https://localhost:9200/articles-*,blogs-*,news-*/_search" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices_boost": [
      { "articles-*": 1.5 },
      { "blogs-*": 1.2 },
      { "news-*": 1.0 }
    ],
    "query": {
      "bool": {
        "must": [
          {
            "multi_match": {
              "query": "elasticsearch performance",
              "fields": ["title^2", "content", "summary"]
            }
          }
        ],
        "filter": [
          { "range": { "publish_date": { "gte": "now-1y" } } }
        ]
      }
    },
    "sort": [
      { "_score": "desc" },
      { "publish_date": { "order": "desc", "unmapped_type": "date" } }
    ],
    "highlight": {
      "fields": {
        "title": {},
        "content": { "fragment_size": 150 }
      }
    },
    "aggs": {
      "by_source": {
        "terms": { "field": "_index" }
      },
      "by_date": {
        "date_histogram": {
          "field": "publish_date",
          "calendar_interval": "month"
        }
      }
    },
    "_source": ["title", "summary", "publish_date", "author"],
    "from": 0,
    "size": 20
  }'
```

## Best Practices

1. **Use aliases** for logical groupings
2. **Limit wildcard scope** when possible
3. **Handle missing fields** in sort and aggregations
4. **Set ignore_unavailable** for resilient queries
5. **Use routing** for performance with known patterns
6. **Monitor cross-cluster latency** for CCS

## Conclusion

Multi-index search in Elasticsearch enables powerful unified search capabilities:

1. **Use wildcards and aliases** for flexible index targeting
2. **Handle field differences** across indices
3. **Boost indices** for relevance tuning
4. **Use cross-cluster search** for distributed data
5. **Configure error handling** for missing indices

With these techniques, you can build robust search applications that span multiple data sources seamlessly.
