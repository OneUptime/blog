# Using Elasticsearch Index Lifecycle Management for Kubernetes Log Data
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Elasticsearch, ILM, Kubernetes, Logging, Index Management
Description: How to configure Elasticsearch Index Lifecycle Management policies to efficiently manage Kubernetes log data from ingestion through deletion
---

Kubernetes clusters generate enormous volumes of log data. Every pod, every container, every system component produces logs that need to be collected, indexed, searched, and eventually cleaned up. Without proper lifecycle management, Elasticsearch clusters storing these logs grow unbounded, consuming expensive storage and degrading query performance. Index Lifecycle Management (ILM) is Elasticsearch's built-in mechanism for automating the entire lifecycle of indices, from creation through rollover, optimization, and deletion. This guide covers how to design and implement ILM policies specifically tailored for Kubernetes log data.

## The Kubernetes Logging Challenge

A typical Kubernetes cluster with 50 nodes running 500 pods can easily generate 10-50 GB of logs per day. Over a 90-day retention period, that adds up to 900 GB to 4.5 TB of log data. Without lifecycle management, you face several problems:

- Indices grow unbounded, causing shard imbalance and memory pressure
- Old data consumes the same expensive storage as current data
- Search performance degrades as index count grows
- Manual cleanup is error-prone and often forgotten

ILM solves these problems by automating index rollover, data tiering, optimization, and deletion based on configurable policies.

## Setting Up the Logging Pipeline

Before configuring ILM, establish the log collection pipeline. A common architecture uses Fluent Bit as the log collector, which ships logs to Elasticsearch:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            cri
        Tag               kube.*
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On
        Refresh_Interval  10

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name            es
        Match           kube.*
        Host            elasticsearch-es-http.elasticsearch.svc
        Port            9200
        HTTP_User       elastic
        HTTP_Passwd     ${ES_PASSWORD}
        Logstash_Format On
        Logstash_Prefix k8s-logs
        Retry_Limit     False
        Replace_Dots    On
        tls             On
        tls.verify      Off
        Suppress_Type_Name On
```

Deploy Fluent Bit as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      tolerations:
        - operator: Exists
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.0
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: config
              mountPath: /fluent-bit/etc/
          env:
            - name: ES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: fluent-bit-config
```

## Designing the ILM Policy

Design your ILM policy based on how your team interacts with log data:

- **Last 24 hours**: Actively queried for debugging and monitoring. Needs fast search.
- **2-7 days**: Queried for incident investigation. Moderate search speed acceptable.
- **8-30 days**: Occasionally queried for trend analysis. Slower search acceptable.
- **31-90 days**: Rarely queried. Compliance retention only.
- **90+ days**: Delete.

Create the ILM policy:

```bash
curl -X PUT "https://elasticsearch-es-http:9200/_ilm/policy/k8s-logs-policy" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_primary_shard_size": "30gb",
            "max_docs": 100000000
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "2d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "allocate": {
            "number_of_replicas": 1,
            "require": {
              "data_tier": "warm"
            }
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0,
            "require": {
              "data_tier": "cold"
            }
          },
          "set_priority": {
            "priority": 0
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

## Creating the Index Template

Link the ILM policy to your log indices through an index template:

```bash
curl -X PUT "https://elasticsearch-es-http:9200/_index_template/k8s-logs-template" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "index_patterns": ["k8s-logs-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "k8s-logs-policy",
      "index.lifecycle.rollover_alias": "k8s-logs",
      "index.number_of_shards": 3,
      "index.number_of_replicas": 1,
      "index.routing.allocation.include._tier_preference": "data_hot",
      "index.codec": "best_compression",
      "index.refresh_interval": "30s",
      "index.translog.durability": "async",
      "index.translog.sync_interval": "30s"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "kubernetes": {
          "properties": {
            "namespace_name": {
              "type": "keyword"
            },
            "pod_name": {
              "type": "keyword"
            },
            "container_name": {
              "type": "keyword"
            },
            "labels": {
              "type": "object",
              "dynamic": true
            },
            "annotations": {
              "enabled": false
            }
          }
        },
        "log": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "stream": {
          "type": "keyword"
        },
        "level": {
          "type": "keyword"
        }
      }
    }
  },
  "priority": 200
}'
```

Bootstrap the initial write index:

```bash
curl -X PUT "https://elasticsearch-es-http:9200/k8s-logs-000001" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "aliases": {
    "k8s-logs": {
      "is_write_index": true
    }
  }
}'
```

## Namespace-Specific Policies

Different Kubernetes namespaces often have different retention requirements. Production namespaces may need 90-day retention while development namespaces only need 7 days:

```bash
# Development namespace policy - short retention
curl -X PUT "https://elasticsearch-es-http:9200/_ilm/policy/k8s-logs-dev-policy" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_primary_shard_size": "20gb"
          }
        }
      },
      "delete": {
        "min_age": "7d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'

# Template for dev namespace logs
curl -X PUT "https://elasticsearch-es-http:9200/_index_template/k8s-logs-dev-template" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "index_patterns": ["k8s-logs-dev-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "k8s-logs-dev-policy",
      "index.lifecycle.rollover_alias": "k8s-logs-dev",
      "index.number_of_shards": 1,
      "index.number_of_replicas": 0
    }
  },
  "priority": 300
}'
```

Update Fluent Bit to route logs by namespace:

```
[OUTPUT]
    Name            es
    Match           kube.var.log.containers.*_dev-*
    Host            elasticsearch-es-http.elasticsearch.svc
    Port            9200
    Logstash_Format On
    Logstash_Prefix k8s-logs-dev

[OUTPUT]
    Name            es
    Match           kube.var.log.containers.*_production-*
    Host            elasticsearch-es-http.elasticsearch.svc
    Port            9200
    Logstash_Format On
    Logstash_Prefix k8s-logs-prod
```

## Monitoring ILM Execution

Track ILM policy execution and catch issues early:

```bash
# Check ILM status for all managed indices
curl -s "https://elasticsearch-es-http:9200/k8s-logs-*/_ilm/explain" \
  -u "elastic:${ES_PASSWORD}" | \
  jq '.indices | to_entries[] | {
    index: .key,
    phase: .value.phase,
    action: .value.action,
    step: .value.step,
    age: .value.age,
    failed_step: .value.failed_step
  }'

# Find indices stuck in an ILM phase
curl -s "https://elasticsearch-es-http:9200/k8s-logs-*/_ilm/explain" \
  -u "elastic:${ES_PASSWORD}" | \
  jq '.indices | to_entries[] | select(.value.failed_step != null) | {
    index: .key,
    failed_step: .value.failed_step,
    step_info: .value.step_info
  }'

# Retry failed ILM steps
curl -X POST "https://elasticsearch-es-http:9200/k8s-logs-000005/_ilm/retry" \
  -u "elastic:${ES_PASSWORD}"
```

Create a Kubernetes CronJob to periodically check ILM health:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ilm-health-check
  namespace: logging
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: ilm-check
              image: curlimages/curl:8.5.0
              command:
                - /bin/sh
                - -c
                - |
                  FAILED=$(curl -s "https://elasticsearch-es-http.elasticsearch.svc:9200/k8s-logs-*/_ilm/explain" \
                    -u "elastic:${ES_PASSWORD}" \
                    --insecure | grep -c '"failed_step"')
                  if [ "$FAILED" -gt 0 ]; then
                    echo "WARNING: $FAILED indices have failed ILM steps"
                    # Send alert to your monitoring system
                    curl -X POST "https://alertmanager:9093/api/v1/alerts" \
                      -H "Content-Type: application/json" \
                      -d "[{\"labels\":{\"alertname\":\"ILMFailure\",\"severity\":\"warning\"},\"annotations\":{\"summary\":\"$FAILED indices have failed ILM steps\"}}]"
                  fi
              env:
                - name: ES_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: elasticsearch-credentials
                      key: password
          restartPolicy: OnFailure
```

## Optimizing Shard Strategy

Proper shard sizing is critical for ILM performance. For Kubernetes logs:

- Target 20-40 GB per primary shard in the hot phase
- After shrink in the warm phase, aim for 30-50 GB per shard
- Each shard consumes heap memory, so fewer larger shards are better than many small ones

Calculate your shard count based on daily log volume:

```
Daily log volume: 50 GB
Target shard size: 25 GB
Number of primary shards: 50 / 25 = 2
Rollover trigger: max_primary_shard_size: 30gb
```

```bash
# Check current shard sizes
curl -s "https://elasticsearch-es-http:9200/_cat/shards/k8s-logs-*?v&h=index,shard,prirep,store,node&s=store:desc" \
  -u "elastic:${ES_PASSWORD}"
```

## Handling Rollover Edge Cases

ILM rollover can encounter issues in certain scenarios:

**Write alias not set**: If Fluent Bit writes directly to dated indices instead of using the rollover alias, ILM rollover will not work. Ensure your log shipper writes to the alias:

```
[OUTPUT]
    Name            es
    Match           kube.*
    Logstash_Format Off
    Index           k8s-logs
    # Use the alias, not a dated pattern
```

**Clock skew between indices**: If indices are created out of order (common during cluster recovery), ILM age calculations may be incorrect. Always use `@timestamp` from the log entry rather than index creation time:

```bash
# Set ILM to use the origination date
curl -X PUT "https://elasticsearch-es-http:9200/_index_template/k8s-logs-template" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "template": {
    "settings": {
      "index.lifecycle.parse_origination_date": true
    }
  }
}'
```

## Data Streams as an Alternative

Elasticsearch Data Streams provide a newer, simplified approach to time-series data management that works well with ILM:

```bash
# Create an index template for data streams
curl -X PUT "https://elasticsearch-es-http:9200/_index_template/k8s-logs-stream" \
  -H "Content-Type: application/json" \
  -u "elastic:${ES_PASSWORD}" \
  -d '{
  "index_patterns": ["k8s-logs-stream"],
  "data_stream": {},
  "template": {
    "settings": {
      "index.lifecycle.name": "k8s-logs-policy",
      "index.number_of_shards": 3,
      "index.number_of_replicas": 1
    }
  },
  "priority": 500
}'
```

Data streams automatically manage the write index and rollover, eliminating the need for manual alias bootstrapping. Fluent Bit can write directly to the data stream name.

## Conclusion

Elasticsearch ILM is essential for managing Kubernetes log data at scale. By defining clear lifecycle policies that match your data access patterns and retention requirements, you automate index rollover, data tiering, optimization, and cleanup. Namespace-specific policies let you apply different retention rules to different environments, reducing storage costs for ephemeral workloads while maintaining compliance for production data. Combined with proper shard sizing, monitoring of ILM execution, and namespace-aware log routing, ILM transforms Kubernetes log management from a manual, error-prone task into a fully automated pipeline. Start with a simple policy covering hot and delete phases, then add warm and cold tiers as your data volume grows and cost optimization becomes more important.
