# How to Deploy Tempo on Rancher for Trace Storage - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Tempo, Distributed Tracing, Grafana, Observability

Description: Deploy Grafana Tempo on Rancher for cost-effective, scalable distributed trace storage that integrates natively with Grafana for trace visualization.

## Introduction

Grafana Tempo is a distributed tracing backend that stores traces in object storage (S3, GCS, Azure Blob) at minimal cost. Unlike tracing backends that rely on a large secondary index, Tempo keeps storage costs low while still supporting trace lookup by ID and TraceQL-based search in Grafana. This guide covers deploying Tempo on Rancher with the Grafana LGTM stack.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- Object storage (S3 or MinIO)
- Grafana (from Rancher Monitoring)

## Step 1: Deploy MinIO for Local Object Storage

For on-premises deployments without cloud object storage:

```bash
# Deploy MinIO for Tempo backend and create the tempo bucket

helm repo add minio https://charts.min.io/
helm install minio minio/minio \
  --namespace observability \
  --create-namespace \
  --set rootUser=minioadmin \
  --set rootPassword=minioadmin \
  --set persistence.size=100Gi \
  --set mode=standalone \
  --set 'buckets[0].name=tempo' \
  --wait
```

## Step 2: Deploy Tempo with Helm

```yaml
# tempo-values.yaml - Tempo distributed configuration
storage:
  trace:
    backend: s3
    s3:
      bucket: tempo
      endpoint: minio.observability.svc.cluster.local:9000
      access_key: minioadmin
      secret_key: minioadmin
      insecure: true

traces:
  otlp:
    grpc:
      enabled: true
    http:
      enabled: true
  jaeger:
    grpc:
      enabled: true
    thriftHttp:
      enabled: true
  zipkin:
    enabled: true

ingester:
  config:
    replication_factor: 2

compactor:
  config:
    compaction:
      block_retention: 720h  # 30 days

querier:
  config:
    max_concurrent_queries: 20

metricsGenerator:
  enabled: true
  config:
    storage:
      path: /var/tempo/wal
      remote_write:
        - url: http://rancher-monitoring-prometheus.cattle-monitoring-system.svc.cluster.local:9090/api/v1/write
          send_exemplars: true

overrides:
  defaults:
    metrics_generator:
      processors:
        - service-graphs
        - span-metrics

metaMonitoring:
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
    labels:
      release: rancher-monitoring
```

If you use Prometheus as the `remote_write` target, make sure its remote write receiver is enabled before deploying Tempo.

```bash
# Add Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Tempo
helm install tempo grafana/tempo-distributed \
  --namespace observability \
  --create-namespace \
  --values tempo-values.yaml \
  --wait

# Check pods
kubectl get pods -n observability -l app.kubernetes.io/name=tempo
```

## Step 3: Configure Grafana to Use Tempo

```yaml
# grafana-tempo-datasource.yaml - Tempo data source for Grafana
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-tempo
  namespace: cattle-monitoring-system
  labels:
    grafana_datasource: "1"
data:
  tempo-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Tempo
        type: tempo
        uid: tempo
        url: http://tempo-query-frontend.observability.svc.cluster.local:3200
        access: proxy
        jsonData:
          tracesToLogsV2:
            # Match the uid of your Loki data source.
            datasourceUid: loki
            spanStartTimeShift: -1h
            spanEndTimeShift: 1h
            filterByTraceID: true
            filterBySpanID: false
            customQuery: true
            query: '{namespace="$${__span.tags.k8s.namespace.name}"}'
          tracesToMetrics:
            # Match the uid of your Prometheus data source.
            datasourceUid: prometheus
            spanStartTimeShift: -1h
            spanEndTimeShift: 1h
          serviceMap:
            datasourceUid: prometheus
          nodeGraph:
            enabled: true
          search:
            hide: false
```

## Step 4: Configure OpenTelemetry Collector to Send to Tempo

```yaml
# otel-tempo-config.yaml - OTel Collector routing to Tempo
config:
  receivers:
    otlp:
      protocols:
        grpc:
        http:
    jaeger:
      protocols:
        grpc:
        thrift_http:

  processors:
    memory_limiter:
      check_interval: 1s
      limit_percentage: 80
      spike_limit_percentage: 25
    k8sattributes: {}
    batch: {}

  exporters:
    otlp/tempo:
      endpoint: tempo-distributor.observability.svc.cluster.local:4317
      tls:
        insecure: true

  service:
    pipelines:
      traces:
        receivers: [otlp, jaeger]
        processors: [memory_limiter, k8sattributes, batch]
        exporters: [otlp/tempo]  # Send to Tempo
```

## Step 5: Enable Trace to Logs Correlation

```yaml
# Add this under the jsonData block of your existing Loki data source
jsonData:
  derivedFields:
    - name: TraceID
      matcherRegex: '"trace_id":"(\w+)"'
      datasourceUid: tempo
      url: '$${__value.raw}'
```

Configure your applications to include trace IDs in log output:

```python
# Python logging with trace correlation
import logging
from opentelemetry import trace

class TraceIdInjectionFilter(logging.Filter):
    def filter(self, record):
        ctx = trace.get_current_span().get_span_context()
        if ctx.is_valid:
            record.trace_id = format(ctx.trace_id, '032x')
            record.span_id = format(ctx.span_id, '016x')
        else:
            record.trace_id = '0' * 32
            record.span_id = '0' * 16
        return True

# Configure JSON formatter with trace ID
logging.basicConfig(
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s","trace_id":"%(trace_id)s","span_id":"%(span_id)s"}'
)
for handler in logging.getLogger().handlers:
    handler.addFilter(TraceIdInjectionFilter())
```

## Step 6: Test the Trace Pipeline

```bash
# Forward the collector and query frontend locally
kubectl port-forward -n observability deployment/otel-collector 4318:4318 &
kubectl port-forward -n observability svc/tempo-query-frontend 3200:3200 &
sleep 2

# Send a test trace through the collector
curl -s -X POST \
  http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{"key": "service.name", "value": {"stringValue": "test-service"}}]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "7bba9f33312b3dbb8b2c2c62bb7abe2d",
          "spanId": "086e83747d0e381e",
          "name": "test-span",
          "startTimeUnixNano": "1609459200000000000",
          "endTimeUnixNano": "1609459200100000000",
          "status": {}
        }]
      }]
    }]
  }'

sleep 2

# Search for the trace in Tempo
curl "http://localhost:3200/api/v2/traces/7bba9f33312b3dbb8b2c2c62bb7abe2d" | jq '.'
```

## Conclusion

Grafana Tempo provides cost-effective distributed trace storage that excels when used alongside Grafana, Loki, and Prometheus in the LGTM (Loki, Grafana, Tempo, Mimir) stack. Its object-storage backend keeps costs low even for high trace volumes. The exemplar-based correlation between metrics, logs, and traces provides a seamless troubleshooting experience in Grafana, allowing you to jump from a slow metric to the specific trace and log entries that explain the slowdown.
