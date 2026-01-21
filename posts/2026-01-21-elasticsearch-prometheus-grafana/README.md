# How to Monitor Elasticsearch with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Prometheus, Grafana, Monitoring, Metrics, Observability

Description: A comprehensive guide to monitoring Elasticsearch with Prometheus and Grafana, covering metric exporters, dashboard creation, alerting rules, and best practices for observability.

---

Effective monitoring is essential for maintaining healthy Elasticsearch clusters. Prometheus provides powerful metric collection and alerting, while Grafana offers rich visualization capabilities. This guide covers setting up comprehensive Elasticsearch monitoring.

## Architecture Overview

```
Elasticsearch Cluster -> Elasticsearch Exporter -> Prometheus -> Grafana
                                                      |
                                                      v
                                                 Alertmanager
```

## Installing Elasticsearch Exporter

### Docker Deployment

```bash
docker run -d \
  --name elasticsearch-exporter \
  -p 9114:9114 \
  quay.io/prometheuscommunity/elasticsearch-exporter:latest \
  --es.uri=https://elastic:password@elasticsearch:9200 \
  --es.all \
  --es.indices \
  --es.indices_settings \
  --es.shards \
  --es.snapshots \
  --es.cluster_settings \
  --es.ssl-skip-verify
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch-exporter
  template:
    metadata:
      labels:
        app: elasticsearch-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9114"
    spec:
      containers:
      - name: elasticsearch-exporter
        image: quay.io/prometheuscommunity/elasticsearch-exporter:latest
        args:
        - "--es.uri=https://elastic:password@elasticsearch:9200"
        - "--es.all"
        - "--es.indices"
        - "--es.indices_settings"
        - "--es.shards"
        - "--es.ssl-skip-verify"
        ports:
        - containerPort: 9114
          name: metrics
        resources:
          limits:
            cpu: 100m
            memory: 128Mi
          requests:
            cpu: 50m
            memory: 64Mi
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-exporter
  namespace: monitoring
  labels:
    app: elasticsearch-exporter
spec:
  ports:
  - port: 9114
    targetPort: 9114
    name: metrics
  selector:
    app: elasticsearch-exporter
```

### Helm Installation

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install elasticsearch-exporter prometheus-community/prometheus-elasticsearch-exporter \
  --namespace monitoring \
  --set es.uri=https://elastic:password@elasticsearch:9200 \
  --set es.all=true \
  --set es.indices=true \
  --set es.indices_settings=true \
  --set es.shards=true
```

## Prometheus Configuration

### Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'elasticsearch'
    static_configs:
      - targets: ['elasticsearch-exporter:9114']
    scrape_interval: 15s
    metrics_path: /metrics
```

### Service Discovery (Kubernetes)

```yaml
scrape_configs:
  - job_name: 'elasticsearch-exporter'
    kubernetes_sd_configs:
      - role: service
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_app]
        regex: elasticsearch-exporter
        action: keep
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
```

## Key Metrics to Monitor

### Cluster Health

```promql
# Cluster status (0=green, 1=yellow, 2=red)
elasticsearch_cluster_health_status{color="green"}
elasticsearch_cluster_health_status{color="yellow"}
elasticsearch_cluster_health_status{color="red"}

# Number of nodes
elasticsearch_cluster_health_number_of_nodes

# Number of data nodes
elasticsearch_cluster_health_number_of_data_nodes

# Active shards
elasticsearch_cluster_health_active_shards

# Unassigned shards
elasticsearch_cluster_health_unassigned_shards

# Relocating shards
elasticsearch_cluster_health_relocating_shards

# Initializing shards
elasticsearch_cluster_health_initializing_shards
```

### Node Metrics

```promql
# JVM heap usage
elasticsearch_jvm_memory_used_bytes{area="heap"}
elasticsearch_jvm_memory_max_bytes{area="heap"}

# JVM heap percentage
elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"} * 100

# CPU usage
elasticsearch_os_cpu_percent

# Disk usage
elasticsearch_filesystem_data_size_bytes
elasticsearch_filesystem_data_free_bytes

# Thread pool rejections
elasticsearch_thread_pool_rejected_count

# Thread pool queue size
elasticsearch_thread_pool_queue_count
```

### Index Metrics

```promql
# Index size
elasticsearch_indices_store_size_bytes_total

# Document count
elasticsearch_indices_docs_total

# Indexing rate
rate(elasticsearch_indices_indexing_index_total[5m])

# Search rate
rate(elasticsearch_indices_search_query_total[5m])

# Search latency
elasticsearch_indices_search_query_time_seconds / elasticsearch_indices_search_query_total
```

## Grafana Dashboard

### Import Pre-built Dashboard

```bash
# Dashboard ID: 14191 - Elasticsearch Cluster
# Dashboard ID: 2322 - Elasticsearch
```

### Custom Dashboard JSON

```json
{
  "dashboard": {
    "title": "Elasticsearch Overview",
    "panels": [
      {
        "title": "Cluster Status",
        "type": "stat",
        "targets": [
          {
            "expr": "elasticsearch_cluster_health_status{color=\"green\"} * 0 + elasticsearch_cluster_health_status{color=\"yellow\"} * 1 + elasticsearch_cluster_health_status{color=\"red\"} * 2",
            "legendFormat": "Status"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              { "type": "value", "options": { "0": { "text": "GREEN", "color": "green" } } },
              { "type": "value", "options": { "1": { "text": "YELLOW", "color": "yellow" } } },
              { "type": "value", "options": { "2": { "text": "RED", "color": "red" } } }
            ]
          }
        }
      },
      {
        "title": "Node Count",
        "type": "stat",
        "targets": [
          {
            "expr": "elasticsearch_cluster_health_number_of_nodes",
            "legendFormat": "Nodes"
          }
        ]
      },
      {
        "title": "JVM Heap Usage",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(elasticsearch_jvm_memory_used_bytes{area=\"heap\"}) / sum(elasticsearch_jvm_memory_max_bytes{area=\"heap\"}) * 100",
            "legendFormat": "Heap %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 70, "color": "yellow" },
                { "value": 85, "color": "red" }
              ]
            },
            "max": 100
          }
        }
      },
      {
        "title": "Indexing Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(elasticsearch_indices_indexing_index_total[5m]))",
            "legendFormat": "docs/sec"
          }
        ]
      },
      {
        "title": "Search Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate(elasticsearch_indices_search_query_total[5m]))",
            "legendFormat": "queries/sec"
          }
        ]
      },
      {
        "title": "Unassigned Shards",
        "type": "stat",
        "targets": [
          {
            "expr": "elasticsearch_cluster_health_unassigned_shards",
            "legendFormat": "Unassigned"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 1, "color": "red" }
              ]
            }
          }
        }
      }
    ]
  }
}
```

## Alerting Rules

### Prometheus Alerting Rules

```yaml
# elasticsearch-alerts.yml
groups:
  - name: elasticsearch
    rules:
      # Cluster Health Red
      - alert: ElasticsearchClusterRed
        expr: elasticsearch_cluster_health_status{color="red"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Elasticsearch cluster is RED"
          description: "Elasticsearch cluster {{ $labels.cluster }} status is RED for more than 5 minutes."

      # Cluster Health Yellow
      - alert: ElasticsearchClusterYellow
        expr: elasticsearch_cluster_health_status{color="yellow"} == 1
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch cluster is YELLOW"
          description: "Elasticsearch cluster {{ $labels.cluster }} status is YELLOW for more than 30 minutes."

      # Unassigned Shards
      - alert: ElasticsearchUnassignedShards
        expr: elasticsearch_cluster_health_unassigned_shards > 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch has unassigned shards"
          description: "Elasticsearch cluster has {{ $value }} unassigned shards."

      # High JVM Heap Usage
      - alert: ElasticsearchHighJVMHeap
        expr: (elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"}) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch JVM heap usage high"
          description: "Elasticsearch node {{ $labels.node }} JVM heap usage is {{ $value }}%."

      # Critical JVM Heap Usage
      - alert: ElasticsearchCriticalJVMHeap
        expr: (elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"}) * 100 > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Elasticsearch JVM heap usage critical"
          description: "Elasticsearch node {{ $labels.node }} JVM heap usage is {{ $value }}%."

      # High CPU Usage
      - alert: ElasticsearchHighCPU
        expr: elasticsearch_os_cpu_percent > 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch CPU usage high"
          description: "Elasticsearch node {{ $labels.node }} CPU usage is {{ $value }}%."

      # Disk Space Low
      - alert: ElasticsearchDiskSpaceLow
        expr: (elasticsearch_filesystem_data_free_bytes / elasticsearch_filesystem_data_size_bytes) * 100 < 20
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch disk space low"
          description: "Elasticsearch node {{ $labels.node }} has only {{ $value }}% disk space free."

      # Thread Pool Rejections
      - alert: ElasticsearchThreadPoolRejections
        expr: increase(elasticsearch_thread_pool_rejected_count{name=~"write|search"}[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch thread pool rejections"
          description: "Elasticsearch node {{ $labels.node }} {{ $labels.name }} thread pool has rejections."

      # Node Down
      - alert: ElasticsearchNodeDown
        expr: elasticsearch_cluster_health_number_of_nodes < 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Elasticsearch node down"
          description: "Elasticsearch cluster has only {{ $value }} nodes, expected 3."

      # Index Health Red
      - alert: ElasticsearchIndexRed
        expr: elasticsearch_index_health_status{color="red"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Elasticsearch index is RED"
          description: "Elasticsearch index {{ $labels.index }} is RED."
```

### Grafana Alerting

```yaml
# grafana-alerts.yml
apiVersion: 1
groups:
  - name: Elasticsearch
    folder: Infrastructure
    interval: 1m
    rules:
      - uid: elasticsearch-cluster-red
        title: Elasticsearch Cluster RED
        condition: A
        data:
          - refId: A
            queryType: instant
            model:
              expr: elasticsearch_cluster_health_status{color="red"}
              instant: true
        noDataState: NoData
        execErrState: Error
        for: 5m
        annotations:
          summary: Elasticsearch cluster is in RED status
        labels:
          severity: critical
```

## Recording Rules

Improve query performance with recording rules:

```yaml
# elasticsearch-recording-rules.yml
groups:
  - name: elasticsearch_recording
    rules:
      # JVM Heap Percentage
      - record: elasticsearch:jvm_heap_used_percent
        expr: elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"} * 100

      # Indexing Rate (5m average)
      - record: elasticsearch:indexing_rate_5m
        expr: sum(rate(elasticsearch_indices_indexing_index_total[5m])) by (cluster)

      # Search Rate (5m average)
      - record: elasticsearch:search_rate_5m
        expr: sum(rate(elasticsearch_indices_search_query_total[5m])) by (cluster)

      # Search Latency
      - record: elasticsearch:search_latency_seconds
        expr: rate(elasticsearch_indices_search_query_time_seconds_total[5m]) / rate(elasticsearch_indices_search_query_total[5m])

      # Disk Usage Percentage
      - record: elasticsearch:disk_used_percent
        expr: (1 - elasticsearch_filesystem_data_free_bytes / elasticsearch_filesystem_data_size_bytes) * 100

      # Total Documents
      - record: elasticsearch:total_docs
        expr: sum(elasticsearch_indices_docs_total) by (cluster)

      # Total Index Size
      - record: elasticsearch:total_index_size_bytes
        expr: sum(elasticsearch_indices_store_size_bytes_total) by (cluster)
```

## Dashboard Panels

### Cluster Overview Row

```json
{
  "panels": [
    {
      "title": "Cluster Status",
      "type": "stat",
      "gridPos": { "x": 0, "y": 0, "w": 4, "h": 4 }
    },
    {
      "title": "Nodes",
      "type": "stat",
      "gridPos": { "x": 4, "y": 0, "w": 4, "h": 4 }
    },
    {
      "title": "Active Shards",
      "type": "stat",
      "gridPos": { "x": 8, "y": 0, "w": 4, "h": 4 }
    },
    {
      "title": "Documents",
      "type": "stat",
      "gridPos": { "x": 12, "y": 0, "w": 4, "h": 4 }
    },
    {
      "title": "Index Size",
      "type": "stat",
      "gridPos": { "x": 16, "y": 0, "w": 4, "h": 4 }
    },
    {
      "title": "Unassigned Shards",
      "type": "stat",
      "gridPos": { "x": 20, "y": 0, "w": 4, "h": 4 }
    }
  ]
}
```

### Performance Metrics Row

```promql
# Indexing throughput
sum(rate(elasticsearch_indices_indexing_index_total[5m])) by (node)

# Search throughput
sum(rate(elasticsearch_indices_search_query_total[5m])) by (node)

# Fetch throughput
sum(rate(elasticsearch_indices_search_fetch_total[5m])) by (node)

# GC time
rate(elasticsearch_jvm_gc_collection_seconds_sum[5m])
```

## Best Practices

### 1. Set Appropriate Scrape Intervals

```yaml
# 15-30 seconds for production
scrape_configs:
  - job_name: 'elasticsearch'
    scrape_interval: 15s
    scrape_timeout: 10s
```

### 2. Use Recording Rules

Pre-compute expensive queries:

```yaml
- record: elasticsearch:heap_percent
  expr: elasticsearch_jvm_memory_used_bytes{area="heap"} / elasticsearch_jvm_memory_max_bytes{area="heap"} * 100
```

### 3. Alert on Trends Not Spikes

```yaml
# Good: Sustained high heap
- alert: ElasticsearchHighHeap
  expr: elasticsearch:heap_percent > 85
  for: 5m

# Bad: Single spike
- alert: ElasticsearchHighHeap
  expr: elasticsearch:heap_percent > 85
  for: 0m
```

### 4. Monitor All Layers

- Cluster health
- Node resources (CPU, memory, disk)
- JVM metrics (heap, GC)
- Index operations (indexing, search)
- Thread pools

### 5. Set Up Alertmanager

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 3h
  receiver: 'elasticsearch-team'

receivers:
  - name: 'elasticsearch-team'
    slack_configs:
      - channel: '#elasticsearch-alerts'
        send_resolved: true
```

## Conclusion

Effective Elasticsearch monitoring requires:

1. **Elasticsearch Exporter** for metric collection
2. **Prometheus** for storage and alerting
3. **Grafana** for visualization
4. **Comprehensive alerts** for cluster health, resources, and performance
5. **Recording rules** for query optimization

With proper monitoring, you can detect issues before they impact users and maintain healthy cluster operations.
