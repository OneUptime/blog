# How to implement Elasticsearch index lifecycle management for log retention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, ILM, Log Retention, Data Management, EFK Stack

Description: Configure Elasticsearch Index Lifecycle Management policies to automatically manage log data through hot-warm-cold-delete phases, optimizing storage costs and query performance for time-series logs.

---

Elasticsearch Index Lifecycle Management (ILM) automates the management of time-series indices through their lifecycle, from creation to deletion. For logging workloads, ILM policies ensure that recent logs remain on fast storage for quick access while older logs are moved to cheaper storage or deleted entirely, optimizing both performance and cost.

This guide covers implementing ILM policies for Kubernetes logs, including hot-warm-cold architecture, rollover strategies, and retention policies.

## Understanding ILM phases

ILM manages indices through four phases:

**Hot phase:** Actively writing and querying recent data on fast SSDs
**Warm phase:** Read-only older data on slower storage
**Cold phase:** Rarely accessed historical data on cheapest storage
**Delete phase:** Remove data beyond retention period

Each phase can trigger actions like rollover, shrink, force merge, or delete.

## Creating a basic ILM policy for logs

Define an ILM policy for Kubernetes logs:

```bash
# Create ILM policy
curl -X PUT "https://elasticsearch.logging.svc:9200/_ilm/policy/kubernetes-logs-policy?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_size": "50gb",
              "max_age": "1d",
              "max_docs": 50000000
            },
            "set_priority": {
              "priority": 100
            }
          }
        },
        "warm": {
          "min_age": "3d",
          "actions": {
            "forcemerge": {
              "max_num_segments": 1
            },
            "shrink": {
              "number_of_shards": 1
            },
            "set_priority": {
              "priority": 50
            }
          }
        },
        "cold": {
          "min_age": "7d",
          "actions": {
            "set_priority": {
              "priority": 0
            },
            "freeze": {}
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

This policy:
- Rolls over daily or at 50GB in hot phase
- Moves to warm after 3 days with optimization
- Freezes in cold after 7 days
- Deletes after 30 days

## Creating index template with ILM

Associate ILM policy with index template:

```bash
curl -X PUT "https://elasticsearch.logging.svc:9200/_index_template/kubernetes-logs-template?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["kubernetes-*"],
    "data_stream": {},
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "index.lifecycle.name": "kubernetes-logs-policy",
        "index.lifecycle.rollover_alias": "kubernetes-logs"
      },
      "mappings": {
        "properties": {
          "@timestamp": {
            "type": "date"
          },
          "kubernetes": {
            "properties": {
              "pod_name": { "type": "keyword" },
              "namespace_name": { "type": "keyword" },
              "container_name": { "type": "keyword" },
              "labels": { "type": "object" }
            }
          },
          "log": { "type": "text" },
          "level": { "type": "keyword" },
          "message": { "type": "text" }
        }
      }
    },
    "priority": 200
  }'
```

## Implementing hot-warm-cold architecture

Configure Elasticsearch nodes with different tiers:

```yaml
# Hot tier data nodes
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-hot
  namespace: logging
spec:
  serviceName: elasticsearch-hot
  replicas: 3
  template:
    spec:
      containers:
        - name: elasticsearch
          env:
            - name: node.roles
              value: "data_hot"
            - name: node.attr.data
              value: "hot"
          # Fast SSD storage
---
# Warm tier data nodes
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-warm
  namespace: logging
spec:
  serviceName: elasticsearch-warm
  replicas: 3
  template:
    spec:
      containers:
        - name: elasticsearch
          env:
            - name: node.roles
              value: "data_warm"
            - name: node.attr.data
              value: "warm"
          # Standard SSD storage
---
# Cold tier data nodes
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-cold
  namespace: logging
spec:
  serviceName: elasticsearch-cold
  replicas: 2
  template:
    spec:
      containers:
        - name: elasticsearch
          env:
            - name: node.roles
              value: "data_cold"
            - name: node.attr.data
              value: "cold"
          # HDD storage
```

## Advanced ILM policy with searchable snapshots

Use searchable snapshots for cold tier:

```bash
curl -X PUT "https://elasticsearch.logging.svc:9200/_ilm/policy/advanced-logs-policy?pretty" \
  -u elastic:$ELASTIC_PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_size": "50gb",
              "max_age": "1d"
            },
            "set_priority": {
              "priority": 100
            }
          }
        },
        "warm": {
          "min_age": "3d",
          "actions": {
            "forcemerge": {
              "max_num_segments": 1
            },
            "readonly": {},
            "allocate": {
              "number_of_replicas": 1,
              "require": {
                "data": "warm"
              }
            },
            "set_priority": {
              "priority": 50
            }
          }
        },
        "cold": {
          "min_age": "7d",
          "actions": {
            "searchable_snapshot": {
              "snapshot_repository": "backup_repository"
            },
            "allocate": {
              "number_of_replicas": 0,
              "require": {
                "data": "cold"
              }
            }
          }
        },
        "delete": {
          "min_age": "90d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

## Monitoring ILM execution

Check ILM status and errors:

```bash
# View ILM status
curl "https://elasticsearch.logging.svc:9200/_ilm/status?pretty" \
  -u elastic:$ELASTIC_PASSWORD

# Check specific index ILM explain
curl "https://elasticsearch.logging.svc:9200/kubernetes-000001/_ilm/explain?pretty" \
  -u elastic:$ELASTIC_PASSWORD

# View all indices and their ILM phase
curl "https://elasticsearch.logging.svc:9200/_cat/indices?v&h=index,health,status,pri,rep,docs.count,store.size,ilm.phase&s=index" \
  -u elastic:$ELASTIC_PASSWORD
```

Deploy monitoring dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elasticsearch-exporter-config
  namespace: logging
data:
  queries.yaml: |
    ilm_phases:
      query: |
        {
          "size": 0,
          "aggs": {
            "phases": {
              "terms": {
                "field": "ilm.phase"
              }
            }
          }
        }
```

## Best practices

1. **Plan retention periods:** Balance compliance requirements with storage costs
2. **Size rollover appropriately:** 50GB per index works well for most cases
3. **Use force merge in warm:** Reduces segment count for better performance
4. **Implement replicas strategically:** Hot=2, Warm=1, Cold=0
5. **Monitor ILM errors:** Set alerts for stuck indices
6. **Test policies in staging:** Validate before production
7. **Document data retention:** Maintain clear retention policies
8. **Regular review:** Adjust policies based on usage patterns

## Conclusion

Elasticsearch ILM automates log lifecycle management, ensuring optimal performance and cost efficiency. By moving data through hot-warm-cold-delete phases, you maintain fast access to recent logs while controlling storage costs for historical data. Properly configured ILM policies form the foundation of scalable, cost-effective log management in production Kubernetes environments.
