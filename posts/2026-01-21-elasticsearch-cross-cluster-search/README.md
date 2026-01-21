# How to Implement Cross-Cluster Search in Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Cross-Cluster Search, CCS, Federation, Distributed Search, Multi-Cluster

Description: A comprehensive guide to implementing Elasticsearch Cross-Cluster Search (CCS) for federated search across multiple clusters with configuration, optimization, and best practices.

---

Cross-Cluster Search (CCS) in Elasticsearch enables you to run search queries across multiple clusters from a single request. This is powerful for federated search, geographic distribution, and organizational separation while maintaining unified search capabilities.

## Understanding Cross-Cluster Search

CCS allows you to:

- **Search multiple clusters** from a single query
- **Federate search** across geographically distributed data
- **Maintain separation** between different teams or environments
- **Access remote data** without replication overhead

### CCS vs CCR

| Feature | CCS | CCR |
|---------|-----|-----|
| Data Location | Stays in source cluster | Replicated to follower |
| Query Latency | Higher (network round-trip) | Lower (local data) |
| Storage Cost | No duplication | Duplicated data |
| Write Location | Source cluster only | Leader cluster only |
| Use Case | Federated search | Disaster recovery |

## Setting Up Remote Cluster Connections

### Basic Configuration

On the cluster that will initiate searches:

```bash
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster": {
      "remote": {
        "cluster-east": {
          "seeds": [
            "east-node-1:9300",
            "east-node-2:9300"
          ]
        },
        "cluster-west": {
          "seeds": [
            "west-node-1:9300",
            "west-node-2:9300"
          ]
        }
      }
    }
  }
}'
```

### Proxy Mode Configuration

For Kubernetes or load-balanced environments:

```bash
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster": {
      "remote": {
        "cluster-east": {
          "mode": "proxy",
          "proxy_address": "east-cluster-proxy:9300",
          "proxy_socket_connections": 18,
          "server_name": "east-cluster.example.com"
        }
      }
    }
  }
}'
```

### Configuration Options

```bash
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster": {
      "remote": {
        "cluster-east": {
          "seeds": ["east-node-1:9300", "east-node-2:9300"],
          "skip_unavailable": true,
          "transport.ping_schedule": "30s",
          "transport.compress": true
        }
      }
    }
  }
}'
```

Key options:

- `skip_unavailable`: Continue searching if this cluster is down
- `transport.ping_schedule`: Health check interval
- `transport.compress`: Compress data transfer

## Verifying Remote Cluster Connection

```bash
curl -X GET "localhost:9200/_remote/info?pretty"
```

Expected response:

```json
{
  "cluster-east": {
    "connected": true,
    "mode": "sniff",
    "seeds": ["east-node-1:9300", "east-node-2:9300"],
    "num_nodes_connected": 3,
    "max_connections_per_cluster": 3,
    "initial_connect_timeout": "30s",
    "skip_unavailable": true
  },
  "cluster-west": {
    "connected": true,
    "mode": "sniff",
    "seeds": ["west-node-1:9300"],
    "num_nodes_connected": 3,
    "max_connections_per_cluster": 3,
    "initial_connect_timeout": "30s",
    "skip_unavailable": true
  }
}
```

## Basic Cross-Cluster Search

### Search Single Remote Cluster

```bash
curl -X GET "localhost:9200/cluster-east:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "message": "error"
    }
  },
  "size": 10
}'
```

### Search Multiple Remote Clusters

```bash
curl -X GET "localhost:9200/cluster-east:logs-*,cluster-west:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"match": {"message": "error"}}
      ],
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "size": 20,
  "sort": [
    {"@timestamp": {"order": "desc"}}
  ]
}'
```

### Search Local and Remote Clusters

```bash
curl -X GET "localhost:9200/logs-*,cluster-east:logs-*,cluster-west:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  },
  "size": 10
}'
```

## Advanced Search Patterns

### Aggregations Across Clusters

```bash
curl -X GET "localhost:9200/cluster-east:logs-*,cluster-west:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-24h"
      }
    }
  },
  "aggs": {
    "by_cluster": {
      "terms": {
        "field": "_index",
        "size": 100
      }
    },
    "error_count": {
      "filter": {
        "term": {"level": "error"}
      }
    },
    "by_service": {
      "terms": {
        "field": "service.name.keyword",
        "size": 20
      },
      "aggs": {
        "avg_response_time": {
          "avg": {
            "field": "response_time"
          }
        }
      }
    }
  }
}'
```

### Using Wildcards

```bash
# Search all indices on remote cluster
curl -X GET "localhost:9200/cluster-east:*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"message": "error"}
  }
}'

# Search specific pattern across all remote clusters
curl -X GET "localhost:9200/*:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  }
}'
```

### Cross-Cluster with Point in Time (PIT)

```bash
# Create PIT on remote cluster
curl -X POST "localhost:9200/cluster-east:logs-*/_pit?keep_alive=5m"

# Use PIT in search
curl -X GET "localhost:9200/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "pit": {
    "id": "your-pit-id",
    "keep_alive": "5m"
  },
  "query": {
    "match_all": {}
  },
  "sort": [
    {"@timestamp": {"order": "desc"}}
  ],
  "size": 100
}'
```

## Performance Optimization

### Minimize Data Transfer

```bash
curl -X GET "localhost:9200/cluster-east:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"message": "error"}
  },
  "_source": ["@timestamp", "message", "level"],
  "size": 10,
  "track_total_hits": false
}'
```

### Use Request Caching

```bash
curl -X GET "localhost:9200/cluster-east:logs-*/_search?request_cache=true&pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "daily_errors": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "day"
      }
    }
  }
}'
```

### Set Appropriate Timeouts

```bash
curl -X GET "localhost:9200/cluster-east:logs-*,cluster-west:logs-*/_search?timeout=30s&pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"message": "error"}
  }
}'
```

### Ccs_minimize_roundtrips

Reduce network round-trips for better performance:

```bash
curl -X GET "localhost:9200/cluster-east:logs-*/_search?ccs_minimize_roundtrips=true&pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"message": "error"}
  },
  "size": 10
}'
```

## Handling Unavailable Clusters

### Configure Skip Unavailable

```bash
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster.remote.cluster-east.skip_unavailable": true,
    "cluster.remote.cluster-west.skip_unavailable": true
  }
}'
```

### Graceful Degradation

When a cluster is unavailable:

```bash
curl -X GET "localhost:9200/cluster-east:logs-*,cluster-west:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  }
}'
```

Response includes cluster information:

```json
{
  "took": 150,
  "timed_out": false,
  "_shards": {
    "total": 10,
    "successful": 5,
    "skipped": 0,
    "failed": 0
  },
  "_clusters": {
    "total": 2,
    "successful": 1,
    "skipped": 1
  },
  "hits": {
    "total": {"value": 1000, "relation": "eq"},
    "hits": []
  }
}
```

## Security Configuration

### TLS for Remote Connections

```yaml
# elasticsearch.yml
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
```

### Create CCS User Role

On the remote cluster:

```bash
curl -X PUT "localhost:9200/_security/role/ccs_reader" -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*", "metrics-*"],
      "privileges": ["read", "view_index_metadata"]
    }
  ]
}'

curl -X PUT "localhost:9200/_security/user/ccs_user" -H 'Content-Type: application/json' -d'
{
  "password": "secure-password",
  "roles": ["ccs_reader"]
}'
```

### API Key for CCS

```bash
curl -X POST "localhost:9200/_security/api_key" -H 'Content-Type: application/json' -d'
{
  "name": "ccs-api-key",
  "role_descriptors": {
    "ccs_role": {
      "cluster": ["monitor"],
      "indices": [
        {
          "names": ["logs-*"],
          "privileges": ["read"]
        }
      ]
    }
  }
}'
```

## Monitoring CCS

### Check Remote Cluster Stats

```bash
curl -X GET "localhost:9200/_remote/info?pretty"
```

### Monitor Search Performance

```bash
# Search stats including remote
curl -X GET "localhost:9200/_nodes/stats/indices/search?pretty"
```

### Profile Cross-Cluster Queries

```bash
curl -X GET "localhost:9200/cluster-east:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "profile": true,
  "query": {
    "match": {"message": "error"}
  },
  "size": 10
}'
```

## Use Cases and Patterns

### Global Search Dashboard

```bash
# Search across all regional clusters
curl -X GET "localhost:9200/us-east:logs-*,us-west:logs-*,eu-west:logs-*,ap-south:logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ],
      "filter": [
        {"term": {"level": "error"}}
      ]
    }
  },
  "size": 0,
  "aggs": {
    "by_region": {
      "terms": {
        "field": "region.keyword"
      }
    },
    "errors_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "5m"
      }
    }
  }
}'
```

### Multi-Tenant Search

```bash
# Tenant-specific search across clusters
curl -X GET "localhost:9200/cluster-a:tenant-123-*,cluster-b:tenant-123-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {"content": "search term"}
  }
}'
```

### Compliance-Aware Search

```bash
# Search only in EU clusters for GDPR data
curl -X GET "localhost:9200/eu-cluster-1:user-data-*,eu-cluster-2:user-data-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "term": {"user_id": "12345"}
  }
}'
```

## Troubleshooting

### Connection Issues

```bash
# Check connectivity
nc -zv remote-cluster-node 9300

# Verify remote cluster info
curl -X GET "localhost:9200/_remote/info?pretty"

# Check cluster health on remote
curl -X GET "remote-cluster-node:9200/_cluster/health?pretty"
```

### Slow Queries

```bash
# Enable slow log on remote clusters
curl -X PUT "remote-cluster:9200/logs-*/_settings" -H 'Content-Type: application/json' -d'
{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s"
}'
```

### Common Errors

**1. Remote Cluster Not Connected**

```bash
# Re-add remote cluster
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster.remote.cluster-east.seeds": null
  }
}'

# Then add again
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster.remote.cluster-east.seeds": ["east-node-1:9300"]
  }
}'
```

**2. Authentication Failed**

Ensure the user has appropriate permissions on remote cluster and credentials are correct.

**3. Index Not Found**

```bash
# Verify index exists on remote
curl -X GET "remote-cluster-node:9200/_cat/indices/logs-*?v"
```

## Best Practices

### 1. Network Optimization

- Use dedicated network links for cross-cluster traffic
- Enable compression for WAN connections
- Set appropriate timeouts for high-latency links

### 2. Query Design

- Filter as much as possible before aggregating
- Limit result sizes with `size` parameter
- Use `_source` filtering to reduce data transfer

### 3. Availability

- Configure `skip_unavailable: true` for fault tolerance
- Monitor cluster connectivity
- Implement fallback mechanisms in applications

### 4. Security

- Use TLS for all cross-cluster communication
- Implement least-privilege access
- Rotate API keys regularly

## Summary

Cross-Cluster Search enables powerful federated search capabilities:

1. **Setup** remote cluster connections with seeds or proxy mode
2. **Query** using `cluster-name:index-pattern` syntax
3. **Optimize** with caching, timeouts, and source filtering
4. **Handle failures** gracefully with `skip_unavailable`
5. **Secure** with TLS and proper authentication

CCS is ideal for searching across geographically distributed data without the storage overhead of replication, making it perfect for global search applications, compliance requirements, and organizational data separation.
