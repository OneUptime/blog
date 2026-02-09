# How to Deploy OpenSearch with Data Streams for Kubernetes Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Kubernetes, Logging

Description: Learn how to deploy OpenSearch with data streams for efficient Kubernetes log storage and analytics, including index lifecycle management, rollover policies, and optimized search performance.

---

OpenSearch data streams provide the optimal architecture for time-series log data from Kubernetes clusters. Unlike traditional indices, data streams automatically handle rollover, apply lifecycle policies, and optimize storage for append-only workloads. This guide shows you how to deploy OpenSearch with data streams configured specifically for Kubernetes log analytics.

## Understanding OpenSearch Data Streams

Data streams offer several advantages for log management:

- **Automatic rollover** - New indices created automatically when size or age thresholds are met
- **Index lifecycle management** - Automatic transition from hot to warm to cold storage
- **Optimized for append-only data** - Perfect for logs that are written once and rarely updated
- **Simplified querying** - Query across all backing indices with a single data stream name

Traditional index approach requires manual rollover and alias management. Data streams handle this automatically.

## Deploying OpenSearch Cluster

Deploy a production-ready OpenSearch cluster:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: opensearch
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: opensearch-master
  namespace: opensearch
spec:
  serviceName: opensearch-master
  replicas: 3
  selector:
    matchLabels:
      app: opensearch
      role: master
  template:
    metadata:
      labels:
        app: opensearch
        role: master
    spec:
      initContainers:
      - name: sysctl
        image: busybox:latest
        command:
        - sysctl
        - -w
        - vm.max_map_count=262144
        securityContext:
          privileged: true
      containers:
      - name: opensearch
        image: opensearchproject/opensearch:2.11.0
        env:
        - name: cluster.name
          value: "opensearch-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "opensearch-master-0,opensearch-master-1,opensearch-master-2"
        - name: cluster.initial_cluster_manager_nodes
          value: "opensearch-master-0,opensearch-master-1,opensearch-master-2"
        - name: node.roles
          value: "cluster_manager"
        - name: OPENSEARCH_JAVA_OPTS
          value: "-Xms2g -Xmx2g"
        - name: DISABLE_SECURITY_PLUGIN
          value: "false"
        - name: DISABLE_INSTALL_DEMO_CONFIG
          value: "true"
        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport
        volumeMounts:
        - name: data
          mountPath: /usr/share/opensearch/data
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: opensearch-data
  namespace: opensearch
spec:
  serviceName: opensearch-data
  replicas: 3
  selector:
    matchLabels:
      app: opensearch
      role: data
  template:
    metadata:
      labels:
        app: opensearch
        role: data
    spec:
      containers:
      - name: opensearch
        image: opensearchproject/opensearch:2.11.0
        env:
        - name: cluster.name
          value: "opensearch-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "opensearch-master-0,opensearch-master-1,opensearch-master-2"
        - name: node.roles
          value: "data,ingest"
        - name: OPENSEARCH_JAVA_OPTS
          value: "-Xms4g -Xmx4g"
        ports:
        - containerPort: 9200
        - containerPort: 9300
        volumeMounts:
        - name: data
          mountPath: /usr/share/opensearch/data
        resources:
          requests:
            memory: "8Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 500Gi
---
apiVersion: v1
kind: Service
metadata:
  name: opensearch
  namespace: opensearch
spec:
  type: ClusterIP
  ports:
  - port: 9200
    name: http
  - port: 9300
    name: transport
  selector:
    app: opensearch
```

## Creating Index Templates for Data Streams

Configure index templates that define data stream behavior:

```bash
# Create index template for Kubernetes logs
curl -X PUT "https://opensearch:9200/_index_template/kubernetes-logs" \
  -H 'Content-Type: application/json' \
  -d '{
  "index_patterns": ["kubernetes-logs-*"],
  "data_stream": {},
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "index.refresh_interval": "30s",
      "index.codec": "best_compression",
      "index.lifecycle.name": "kubernetes-logs-policy",
      "index.lifecycle.rollover_alias": "kubernetes-logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "namespace": {
          "type": "keyword"
        },
        "pod": {
          "type": "keyword"
        },
        "container": {
          "type": "keyword"
        },
        "node": {
          "type": "keyword"
        },
        "level": {
          "type": "keyword"
        },
        "message": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "labels": {
          "type": "object",
          "dynamic": true
        },
        "kubernetes": {
          "properties": {
            "namespace_name": { "type": "keyword" },
            "pod_name": { "type": "keyword" },
            "container_name": { "type": "keyword" },
            "labels": { "type": "object", "dynamic": true }
          }
        }
      }
    }
  },
  "priority": 200,
  "composed_of": [],
  "version": 1,
  "_meta": {
    "description": "Template for Kubernetes log data streams"
  }
}'
```

## Implementing Index Lifecycle Management

Create ILM policy for automatic index management:

```bash
# Create lifecycle policy
curl -X PUT "https://opensearch:9200/_plugins/_ism/policies/kubernetes-logs-policy" \
  -H 'Content-Type: application/json' \
  -d '{
  "policy": {
    "description": "Kubernetes logs lifecycle policy",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [
          {
            "rollover": {
              "min_size": "50gb",
              "min_index_age": "1d"
            }
          }
        ],
        "transitions": [
          {
            "state_name": "warm",
            "conditions": {
              "min_index_age": "3d"
            }
          }
        ]
      },
      {
        "name": "warm",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 1
            }
          },
          {
            "force_merge": {
              "max_num_segments": 1
            }
          }
        ],
        "transitions": [
          {
            "state_name": "cold",
            "conditions": {
              "min_index_age": "7d"
            }
          }
        ]
      },
      {
        "name": "cold",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 0
            }
          }
        ],
        "transitions": [
          {
            "state_name": "delete",
            "conditions": {
              "min_index_age": "30d"
            }
          }
        ]
      },
      {
        "name": "delete",
        "actions": [
          {
            "delete": {}
          }
        ]
      }
    ]
  }
}'
```

## Configuring Fluent Bit to Write to Data Streams

Configure Fluent Bit to write logs to OpenSearch data streams:

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
        Daemon        Off
        Log_Level     info

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name            opensearch
        Match           kube.*
        Host            opensearch.opensearch.svc.cluster.local
        Port            9200
        Index           kubernetes-logs
        Type            _doc
        Logstash_Format Off
        Generate_ID     On
        Write_Operation create
        Suppress_Type_Name On
        tls             On
        tls.verify      Off
```

## Creating Data Stream

Initialize the data stream:

```bash
# Create data stream (automatically created on first write with proper template)
curl -X PUT "https://opensearch:9200/_data_stream/kubernetes-logs"

# Verify data stream
curl -X GET "https://opensearch:9200/_data_stream/kubernetes-logs"
```

## Querying Data Streams

Query logs efficiently across all backing indices:

```bash
# Simple search
curl -X GET "https://opensearch:9200/kubernetes-logs/_search" \
  -H 'Content-Type: application/json' \
  -d '{
  "query": {
    "bool": {
      "must": [
        {
          "range": {
            "@timestamp": {
              "gte": "now-1h"
            }
          }
        },
        {
          "match": {
            "level": "error"
          }
        }
      ]
    }
  },
  "sort": [
    {
      "@timestamp": {
        "order": "desc"
      }
    }
  ],
  "size": 100
}'

# Aggregation query - count logs by namespace
curl -X GET "https://opensearch:9200/kubernetes-logs/_search" \
  -H 'Content-Type: application/json' \
  -d '{
  "size": 0,
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-24h"
      }
    }
  },
  "aggs": {
    "by_namespace": {
      "terms": {
        "field": "namespace",
        "size": 20
      },
      "aggs": {
        "by_level": {
          "terms": {
            "field": "level"
          }
        }
      }
    }
  }
}'
```

## Deploying OpenSearch Dashboards

Deploy dashboards for log visualization:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opensearch-dashboards
  namespace: opensearch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opensearch-dashboards
  template:
    metadata:
      labels:
        app: opensearch-dashboards
    spec:
      containers:
      - name: dashboards
        image: opensearchproject/opensearch-dashboards:2.11.0
        env:
        - name: OPENSEARCH_HOSTS
          value: "https://opensearch:9200"
        - name: DISABLE_SECURITY_DASHBOARDS_PLUGIN
          value: "false"
        ports:
        - containerPort: 5601
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: opensearch-dashboards
  namespace: opensearch
spec:
  type: LoadBalancer
  ports:
  - port: 5601
    targetPort: 5601
  selector:
    app: opensearch-dashboards
```

## Monitoring Data Stream Health

Monitor data stream performance:

```bash
# Get data stream stats
curl -X GET "https://opensearch:9200/_data_stream/kubernetes-logs/_stats"

# Check backing indices
curl -X GET "https://opensearch:9200/_data_stream/kubernetes-logs"

# Monitor index sizes
curl -X GET "https://opensearch:9200/_cat/indices/.ds-kubernetes-logs-*?v&s=index"

# Check shard allocation
curl -X GET "https://opensearch:9200/_cat/shards/.ds-kubernetes-logs-*?v"
```

## Optimizing Search Performance

Improve query performance:

```bash
# Set index refresh interval
curl -X PUT "https://opensearch:9200/.ds-kubernetes-logs-*/_settings" \
  -H 'Content-Type: application/json' \
  -d '{
  "index": {
    "refresh_interval": "30s"
  }
}'

# Force merge old indices
curl -X POST "https://opensearch:9200/.ds-kubernetes-logs-000001/_forcemerge?max_num_segments=1"

# Clear cache
curl -X POST "https://opensearch:9200/kubernetes-logs/_cache/clear"
```

## Conclusion

OpenSearch data streams provide an optimized architecture for Kubernetes log analytics. With automatic rollover, lifecycle management, and efficient querying across time periods, data streams simplify log management while improving performance and reducing storage costs. Deploy with proper lifecycle policies, configure Fluent Bit for efficient log shipping, and use OpenSearch Dashboards for powerful log visualization and analysis.
