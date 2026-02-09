# How to Set Up Elasticsearch Monitoring with Metricbeat on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Metricbeat, Monitoring, Kubernetes, Observability

Description: Implement comprehensive Elasticsearch cluster monitoring using Metricbeat on Kubernetes, including node metrics, cluster health, index statistics, and alerting configuration for production deployments.

---

Metricbeat provides lightweight, efficient monitoring for Elasticsearch clusters by collecting metrics directly from the Elasticsearch API and shipping them back to Elasticsearch for analysis. When running on Kubernetes, Metricbeat deploys as a DaemonSet to monitor each node while respecting cluster topology and resource constraints. This approach gives you deep visibility into cluster health, performance, and capacity without adding significant overhead.

## Understanding Metricbeat Architecture

Metricbeat consists of modules that collect metrics from specific services. The Elasticsearch module queries the cluster API endpoints to gather node statistics, cluster state, index metrics, and shard allocation information. It runs these collections on a configurable schedule, typically every 10-30 seconds.

In Kubernetes deployments, Metricbeat needs to reach Elasticsearch endpoints from within the cluster. This requires proper service discovery, authentication configuration, and network policies. The collected metrics flow back into Elasticsearch, often to dedicated monitoring indices, where Kibana can visualize them through pre-built dashboards.

This self-monitoring pattern where Elasticsearch monitors itself works well because metrics volume stays manageable. Even large clusters generate only megabytes of monitoring data per day, negligible compared to log volumes.

## Deploying Metricbeat on Kubernetes

Create a ConfigMap with Metricbeat configuration:

```yaml
# metricbeat-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metricbeat-config
  namespace: logging
data:
  metricbeat.yml: |
    metricbeat.modules:
    - module: elasticsearch
      metricsets:
        - node
        - node_stats
        - index
        - index_recovery
        - index_summary
        - shard
        - ml_job
      period: 10s
      hosts: ["http://elasticsearch:9200"]
      username: "${ELASTICSEARCH_USERNAME}"
      password: "${ELASTICSEARCH_PASSWORD}"
      xpack.enabled: true

    - module: system
      metricsets:
        - cpu
        - load
        - memory
        - network
        - process
        - process_summary
        - filesystem
      enabled: true
      period: 10s
      processes: ['.*']

    - module: kubernetes
      metricsets:
        - node
        - pod
        - container
        - volume
      period: 10s
      hosts: ["https://${KUBERNETES_SERVICE_HOST}:${KUBERNETES_SERVICE_PORT}"]
      bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
      ssl.certificate_authorities:
        - /var/run/secrets/kubernetes.io/serviceaccount/ca.crt

    output.elasticsearch:
      hosts: ["http://elasticsearch:9200"]
      username: "${ELASTICSEARCH_USERNAME}"
      password: "${ELASTICSEARCH_PASSWORD}"
      indices:
        - index: "metricbeat-elasticsearch-%{+yyyy.MM.dd}"
          when.contains:
            event.module: "elasticsearch"
        - index: "metricbeat-system-%{+yyyy.MM.dd}"
          when.contains:
            event.module: "system"

    setup.kibana:
      host: "http://kibana:5601"
      username: "${ELASTICSEARCH_USERNAME}"
      password: "${ELASTICSEARCH_PASSWORD}"

    setup.dashboards.enabled: true
    setup.template.enabled: true
    setup.ilm.enabled: true
```

Create the DaemonSet deployment:

```yaml
# metricbeat-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: metricbeat
  namespace: logging
  labels:
    app: metricbeat
spec:
  selector:
    matchLabels:
      app: metricbeat
  template:
    metadata:
      labels:
        app: metricbeat
    spec:
      serviceAccountName: metricbeat
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: metricbeat
        image: docker.elastic.co/beats/metricbeat:8.11.0
        args: [
          "-c", "/etc/metricbeat.yml",
          "-e",
          "-system.hostfs=/hostfs"
        ]
        env:
        - name: ELASTICSEARCH_USERNAME
          value: "elastic"
        - name: ELASTICSEARCH_PASSWORD
          valueFrom:
            secretKeyRef:
              name: elasticsearch-credentials
              key: password
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        resources:
          requests:
            memory: 200Mi
            cpu: 100m
          limits:
            memory: 400Mi
            cpu: 200m
        securityContext:
          runAsUser: 0
        volumeMounts:
        - name: config
          mountPath: /etc/metricbeat.yml
          readOnly: true
          subPath: metricbeat.yml
        - name: data
          mountPath: /usr/share/metricbeat/data
        - name: dockersock
          mountPath: /var/run/docker.sock
          readOnly: true
        - name: proc
          mountPath: /hostfs/proc
          readOnly: true
        - name: cgroup
          mountPath: /hostfs/sys/fs/cgroup
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: metricbeat-config
      - name: data
        hostPath:
          path: /var/lib/metricbeat-data
          type: DirectoryOrCreate
      - name: dockersock
        hostPath:
          path: /var/run/docker.sock
      - name: proc
        hostPath:
          path: /proc
      - name: cgroup
        hostPath:
          path: /sys/fs/cgroup
```

Create RBAC resources:

```yaml
# metricbeat-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: metricbeat
  namespace: logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: metricbeat
rules:
- apiGroups: [""]
  resources:
  - nodes
  - namespaces
  - events
  - pods
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources:
  - jobs
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: metricbeat
subjects:
- kind: ServiceAccount
  name: metricbeat
  namespace: logging
roleRef:
  kind: ClusterRole
  name: metricbeat
  apiGroup: rbac.authorization.k8s.io
```

Deploy all resources:

```bash
kubectl create namespace logging
kubectl apply -f metricbeat-rbac.yaml
kubectl apply -f metricbeat-config.yaml
kubectl apply -f metricbeat-daemonset.yaml
```

## Configuring Elasticsearch Module Metricsets

The Elasticsearch module includes multiple metricsets, each collecting different aspects of cluster health:

```yaml
# Detailed Elasticsearch module configuration
- module: elasticsearch
  metricsets:
    # Node-level metrics (CPU, memory, disk I/O)
    - node
    # Detailed node statistics (indexing rate, search rate, JVM heap)
    - node_stats
    # Index-level metrics (size, document count)
    - index
    # Index recovery operations
    - index_recovery
    # Summary statistics across all indices
    - index_summary
    # Shard allocation and status
    - shard
    # Machine learning job metrics
    - ml_job
    # Cluster health and status
    - cluster_stats
    # Pending cluster tasks
    - pending_tasks
  period: 10s
  hosts: ["http://elasticsearch:9200"]

  # Authentication
  username: "${ELASTICSEARCH_USERNAME}"
  password: "${ELASTICSEARCH_PASSWORD}"

  # Enable X-Pack monitoring
  xpack.enabled: true

  # Scope for multi-cluster monitoring
  scope: cluster

  # Optional: Monitor specific indices only
  index_recovery.active_only: true
```

Each metricset generates specific metrics. The node_stats metricset provides CPU usage, heap utilization, and thread pool statistics. The shard metricset reveals unassigned shards and replication lag.

## Setting Up Index Templates and ILM

Configure index lifecycle management for monitoring data:

```bash
# Create ILM policy for Metricbeat data
curl -X PUT "http://elasticsearch:9200/_ilm/policy/metricbeat-policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_size": "10gb",
              "max_age": "1d"
            },
            "set_priority": {
              "priority": 100
            }
          }
        },
        "warm": {
          "min_age": "7d",
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

This policy keeps hot metrics for a day, compacts them after a week, and deletes after 30 days.

## Visualizing Metrics in Kibana

Metricbeat automatically creates Kibana dashboards when setup.dashboards.enabled is true. Access them through Kibana:

```bash
# Navigate to Kibana > Dashboard
# Search for "Elasticsearch" to find monitoring dashboards:
# - [Metricbeat Elasticsearch] Overview
# - [Metricbeat Elasticsearch] Node Stats
# - [Metricbeat Elasticsearch] Index Stats
```

These dashboards show cluster health, node performance, indexing throughput, search latency, and resource utilization.

Create custom visualizations for specific metrics:

```bash
# In Kibana > Visualize > Create visualization
# Choose Lens or TSVB

# Example: JVM heap usage over time
# Metric: elasticsearch.node.stats.jvm.mem.heap.used.pct
# Aggregation: Average
# Group by: elasticsearch.node.name

# Example: Indexing rate
# Metric: elasticsearch.node.stats.indices.indexing.index_total
# Aggregation: Derivative (rate)
# Group by: elasticsearch.node.name
```

## Configuring Alerts for Elasticsearch Health

Create Watcher alerts based on Metricbeat data:

```bash
# Alert when heap usage exceeds 85%
curl -X PUT "http://elasticsearch:9200/_watcher/watch/high-heap-usage" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "trigger": {
      "schedule": {
        "interval": "1m"
      }
    },
    "input": {
      "search": {
        "request": {
          "indices": ["metricbeat-elasticsearch-*"],
          "body": {
            "size": 0,
            "query": {
              "bool": {
                "must": [
                  {
                    "range": {
                      "@timestamp": {
                        "gte": "now-5m"
                      }
                    }
                  },
                  {
                    "range": {
                      "elasticsearch.node.stats.jvm.mem.heap.used.pct": {
                        "gte": 85
                      }
                    }
                  }
                ]
              }
            },
            "aggs": {
              "nodes": {
                "terms": {
                  "field": "elasticsearch.node.name"
                }
              }
            }
          }
        }
      }
    },
    "condition": {
      "compare": {
        "ctx.payload.hits.total.value": {
          "gt": 0
        }
      }
    },
    "actions": {
      "log_alert": {
        "logging": {
          "level": "warn",
          "text": "High heap usage detected on Elasticsearch nodes: {{ctx.payload.aggregations.nodes.buckets}}"
        }
      }
    }
  }'
```

Alert on unassigned shards:

```bash
# Alert when shards remain unassigned
curl -X PUT "http://elasticsearch:9200/_watcher/watch/unassigned-shards" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "trigger": {
      "schedule": {
        "interval": "5m"
      }
    },
    "input": {
      "search": {
        "request": {
          "indices": ["metricbeat-elasticsearch-*"],
          "body": {
            "size": 0,
            "query": {
              "bool": {
                "must": [
                  {
                    "range": {
                      "@timestamp": {
                        "gte": "now-5m"
                      }
                    }
                  },
                  {
                    "term": {
                      "elasticsearch.cluster.stats.status": "yellow"
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    "condition": {
      "compare": {
        "ctx.payload.hits.total.value": {
          "gt": 0
        }
      }
    },
    "actions": {
      "notify": {
        "logging": {
          "level": "error",
          "text": "Elasticsearch cluster has unassigned shards"
        }
      }
    }
  }'
```

## Monitoring Multi-Cluster Deployments

For environments with multiple Elasticsearch clusters, configure Metricbeat to monitor all of them:

```yaml
# Multi-cluster monitoring configuration
metricbeat.modules:
- module: elasticsearch
  metricsets: ["node", "node_stats", "cluster_stats"]
  period: 10s
  hosts: ["http://prod-elasticsearch:9200"]
  username: "${PROD_ES_USERNAME}"
  password: "${PROD_ES_PASSWORD}"
  cluster_uuid: "prod-cluster"

- module: elasticsearch
  metricsets: ["node", "node_stats", "cluster_stats"]
  period: 10s
  hosts: ["http://staging-elasticsearch:9200"]
  username: "${STAGING_ES_USERNAME}"
  password: "${STAGING_ES_PASSWORD}"
  cluster_uuid: "staging-cluster"

output.elasticsearch:
  hosts: ["http://monitoring-elasticsearch:9200"]
  username: "${MONITORING_USERNAME}"
  password: "${MONITORING_PASSWORD}"
```

This configuration monitors production and staging clusters, sending all metrics to a dedicated monitoring cluster.

## Troubleshooting Metricbeat

Check Metricbeat logs for connection issues:

```bash
# View logs from DaemonSet
kubectl logs -n logging daemonset/metricbeat -f

# Check specific pod
kubectl logs -n logging metricbeat-xxxxx

# Look for common errors:
# - Authentication failures
# - Network connectivity issues
# - Permission errors
```

Verify metrics are being collected:

```bash
# Check if indices are created
curl -X GET "http://elasticsearch:9200/_cat/indices/metricbeat-*?v" \
  -u elastic:password

# Query recent metrics
curl -X GET "http://elasticsearch:9200/metricbeat-elasticsearch-*/_search?size=1&sort=@timestamp:desc" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "query": {
      "match_all": {}
    }
  }'
```

Test Metricbeat configuration:

```bash
# Run configuration test
kubectl exec -n logging metricbeat-xxxxx -- metricbeat test config

# Test output connectivity
kubectl exec -n logging metricbeat-xxxxx -- metricbeat test output
```

## Performance Tuning

Optimize Metricbeat for large clusters:

```yaml
metricbeat.modules:
- module: elasticsearch
  metricsets: ["node_stats", "cluster_stats"]
  period: 30s  # Reduce collection frequency
  hosts: ["http://elasticsearch:9200"]

  # Disable expensive metricsets
  index_recovery.active_only: true

  # Limit shard metrics collection
  shard.enabled: false

# Adjust buffer sizes
queue.mem:
  events: 4096
  flush.min_events: 2048
  flush.timeout: 1s

# Batch output
output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  bulk_max_size: 5000
  worker: 2
```

Monitor Metricbeat resource usage:

```bash
# Check Metricbeat pod resources
kubectl top pods -n logging -l app=metricbeat

# Review resource limits
kubectl describe daemonset metricbeat -n logging | grep -A 5 "Limits"
```

## Conclusion

Metricbeat provides comprehensive, low-overhead monitoring for Elasticsearch clusters running on Kubernetes. By collecting metrics from the Elasticsearch API and shipping them back to the cluster, you create a self-monitoring system that reveals performance bottlenecks, capacity issues, and health problems before they impact users. The pre-built Kibana dashboards give immediate visibility, while custom alerts ensure your team responds quickly to issues. Deploy Metricbeat as part of your Elasticsearch setup from day one to maintain visibility as your cluster scales.
