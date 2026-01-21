# How to Monitor Loki with Prometheus and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Prometheus, Monitoring, Observability, Metrics, Dashboards

Description: A comprehensive guide to monitoring Grafana Loki with Prometheus and Grafana, covering internal metrics, dashboard configuration, alerting, and operational best practices.

---

Monitoring Loki itself is essential for maintaining a healthy logging infrastructure. Loki exposes Prometheus metrics that provide insights into ingestion rates, query performance, storage health, and component status. This guide covers setting up comprehensive monitoring for your Loki deployment.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki deployment (any mode)
- Prometheus instance
- Grafana for dashboards
- Basic understanding of Prometheus metrics

## Loki Metrics Endpoint

Loki exposes metrics at `/metrics`:

```bash
curl http://loki:3100/metrics
```

## Key Metrics Categories

### Ingestion Metrics

| Metric | Description |
|--------|-------------|
| `loki_distributor_lines_received_total` | Total log lines received |
| `loki_distributor_bytes_received_total` | Total bytes received |
| `loki_ingester_chunks_created_total` | Chunks created by ingester |
| `loki_ingester_chunks_flushed_total` | Chunks flushed to storage |
| `loki_ingester_wal_bytes_total` | WAL bytes written |

### Query Metrics

| Metric | Description |
|--------|-------------|
| `loki_request_duration_seconds` | Request latency histogram |
| `loki_querier_tail_active` | Active tail connections |
| `loki_query_frontend_queries_total` | Total queries processed |
| `loki_query_frontend_queue_length` | Query queue length |

### Storage Metrics

| Metric | Description |
|--------|-------------|
| `loki_chunk_store_chunks_stored_total` | Total chunks stored |
| `loki_compactor_running` | Compactor running status |
| `loki_boltdb_shipper_uploads_total` | Index uploads to storage |

### Component Health

| Metric | Description |
|--------|-------------|
| `cortex_ring_members` | Ring member status |
| `loki_build_info` | Build information |
| `up` | Component availability |

## Prometheus Configuration

### Service Discovery for Kubernetes

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'loki'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - loki
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_name]
        regex: loki
        action: keep
      - source_labels: [__meta_kubernetes_pod_container_port_name]
        regex: http-metrics
        action: keep
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_label_app_kubernetes_io_component]
        target_label: component
```

### Static Configuration

```yaml
scrape_configs:
  - job_name: 'loki'
    static_configs:
      - targets:
          - 'loki-distributor:3100'
          - 'loki-ingester:3100'
          - 'loki-querier:3100'
          - 'loki-query-frontend:3100'
          - 'loki-compactor:3100'
    relabel_configs:
      - source_labels: [__address__]
        regex: 'loki-([^:]+):.*'
        target_label: component
        replacement: '${1}'
```

### ServiceMonitor for Prometheus Operator

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: loki
  namespace: loki
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: loki
  namespaceSelector:
    matchNames:
      - loki
  endpoints:
    - port: http-metrics
      interval: 30s
      path: /metrics
```

## Essential Prometheus Queries

### Ingestion Monitoring

```promql
# Log lines received per second
sum(rate(loki_distributor_lines_received_total[5m]))

# Bytes received per second
sum(rate(loki_distributor_bytes_received_total[5m]))

# Lines received by tenant
sum by (tenant) (rate(loki_distributor_lines_received_total[5m]))

# Ingestion rate by ingester
sum by (pod) (rate(loki_ingester_chunks_created_total[5m]))
```

### Query Performance

```promql
# Query latency P99
histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le))

# Query latency P50
histogram_quantile(0.5, sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le))

# Query rate
sum(rate(loki_request_duration_seconds_count{route=~"/loki/api/v1/query.*"}[5m]))

# Query errors
sum(rate(loki_request_duration_seconds_count{route=~"/loki/api/v1/query.*", status_code!~"2.."}[5m]))
```

### Storage Health

```promql
# Chunks stored per second
sum(rate(loki_chunk_store_chunks_stored_total[5m]))

# Compactor status
loki_compactor_running

# Index uploads
sum(rate(loki_boltdb_shipper_uploads_total[5m]))

# Storage errors
sum(rate(loki_chunk_store_errors_total[5m]))
```

### Component Health

```promql
# Ring members status
sum by (state) (cortex_ring_members{job="loki"})

# Active ingesters
count(cortex_ring_members{job="loki", name="ingester", state="ACTIVE"})

# Component up status
up{job="loki"}

# Memory usage
process_resident_memory_bytes{job="loki"}
```

### Rate Limiting

```promql
# Rate limited requests
sum(rate(loki_distributor_lines_dropped_total[5m]))

# Ingestion rate vs limit
sum(rate(loki_distributor_bytes_received_total[5m]))
/
loki_distributor_ingestion_rate_limit_bytes
```

## Grafana Dashboard

### Dashboard JSON (Key Panels)

```json
{
  "title": "Loki Overview",
  "panels": [
    {
      "title": "Ingestion Rate (lines/s)",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(rate(loki_distributor_lines_received_total[5m]))",
          "legendFormat": "Lines/s"
        }
      ]
    },
    {
      "title": "Ingestion Rate Over Time",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(loki_distributor_lines_received_total[5m]))",
          "legendFormat": "Lines/s"
        },
        {
          "expr": "sum(rate(loki_distributor_bytes_received_total[5m])) / 1024 / 1024",
          "legendFormat": "MB/s"
        }
      ]
    },
    {
      "title": "Query Latency",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.50, sum(rate(loki_request_duration_seconds_bucket{route=~\"/loki/api/v1/query.*\"}[5m])) by (le))",
          "legendFormat": "P50"
        },
        {
          "expr": "histogram_quantile(0.95, sum(rate(loki_request_duration_seconds_bucket{route=~\"/loki/api/v1/query.*\"}[5m])) by (le))",
          "legendFormat": "P95"
        },
        {
          "expr": "histogram_quantile(0.99, sum(rate(loki_request_duration_seconds_bucket{route=~\"/loki/api/v1/query.*\"}[5m])) by (le))",
          "legendFormat": "P99"
        }
      ]
    },
    {
      "title": "Component Status",
      "type": "table",
      "targets": [
        {
          "expr": "up{job=\"loki\"}",
          "format": "table",
          "instant": true
        }
      ]
    },
    {
      "title": "Ring Members",
      "type": "piechart",
      "targets": [
        {
          "expr": "sum by (state) (cortex_ring_members{job=\"loki\", name=\"ingester\"})",
          "legendFormat": "{{state}}"
        }
      ]
    }
  ]
}
```

## Alerting Rules

### Prometheus Alert Rules

```yaml
groups:
  - name: loki-alerts
    rules:
      - alert: LokiIngesterDown
        expr: up{job="loki", component="ingester"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Loki ingester is down"
          description: "Loki ingester {{ $labels.pod }} has been down for more than 5 minutes"

      - alert: LokiHighIngestionRate
        expr: sum(rate(loki_distributor_bytes_received_total[5m])) > 100000000
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High Loki ingestion rate"
          description: "Ingestion rate is {{ $value | humanizeBytes }}/s"

      - alert: LokiHighQueryLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(loki_request_duration_seconds_bucket{route=~"/loki/api/v1/query.*"}[5m])) by (le)
          ) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High Loki query latency"
          description: "P99 query latency is {{ $value | printf \"%.2f\" }}s"

      - alert: LokiIngesterRingUnhealthy
        expr: |
          sum(cortex_ring_members{job="loki", name="ingester", state!="ACTIVE"}) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Loki ingester ring unhealthy"
          description: "{{ $value }} ingesters are not in ACTIVE state"

      - alert: LokiCompactorNotRunning
        expr: loki_compactor_running == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Loki compactor not running"
          description: "Compactor has not been running for 15 minutes"

      - alert: LokiRateLimited
        expr: sum(rate(loki_distributor_lines_dropped_total[5m])) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Loki is rate limiting"
          description: "{{ $value | printf \"%.0f\" }} lines/s are being dropped"

      - alert: LokiStorageErrors
        expr: sum(rate(loki_chunk_store_errors_total[5m])) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Loki storage errors"
          description: "Storage errors detected: {{ $value | printf \"%.2f\" }}/s"
```

## Operational Dashboards

### Capacity Planning Queries

```promql
# Daily ingestion volume
sum(increase(loki_distributor_bytes_received_total[24h]))

# Average chunk size
sum(rate(loki_ingester_chunk_size_bytes_sum[5m]))
/
sum(rate(loki_ingester_chunk_size_bytes_count[5m]))

# Streams per tenant
sum by (tenant) (loki_ingester_memory_streams)

# Retention effectiveness
loki_compactor_retention_bytes_deleted_total
```

### Performance Tuning Queries

```promql
# Query queue wait time
histogram_quantile(0.95, sum(rate(loki_query_frontend_queue_duration_seconds_bucket[5m])) by (le))

# Parallel query performance
histogram_quantile(0.95, sum(rate(loki_querier_split_queries_bucket[5m])) by (le))

# Cache hit ratio
sum(rate(loki_query_frontend_cache_hits_total[5m]))
/
(sum(rate(loki_query_frontend_cache_hits_total[5m])) + sum(rate(loki_query_frontend_cache_misses_total[5m])))
```

## Best Practices

### Metric Collection

1. Scrape all Loki components
2. Use appropriate scrape intervals (15-30s)
3. Label metrics with component names
4. Monitor both write and read paths

### Dashboard Organization

1. Overview dashboard with key metrics
2. Detailed dashboards per component
3. Capacity planning dashboard
4. Troubleshooting dashboard

### Alerting Strategy

1. Alert on component availability
2. Alert on ingestion anomalies
3. Alert on query performance degradation
4. Alert on storage issues

## Conclusion

Monitoring Loki with Prometheus and Grafana provides visibility into your logging infrastructure. Key takeaways:

- Scrape metrics from all Loki components
- Monitor ingestion rates, query latency, and storage health
- Set up alerts for component failures and performance issues
- Use dashboards for capacity planning and troubleshooting
- Regularly review metrics to optimize Loki configuration

Proper monitoring ensures your logging infrastructure remains healthy and performant.
