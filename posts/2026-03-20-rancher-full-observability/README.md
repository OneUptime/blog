# How to Set Up Full Observability Stack on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Observability, Prometheus, Grafana, Loki, Tempo, Mimir

Description: Build a complete observability stack on Rancher covering metrics, logs, and traces with Prometheus, Loki, Tempo, and Grafana for full-stack visibility.

## Introduction

Full observability means having correlated visibility into all three pillars: metrics (what is happening), logs (why it is happening), and traces (where it is happening). This guide covers deploying the complete LGTM stack (Loki, Grafana, Tempo, Mimir) on Rancher alongside the existing Prometheus-based Rancher Monitoring.

## Architecture Overview

```text
Applications
    │
    ▼
OpenTelemetry Collector (central pipeline)
    ├── Metrics ──► Mimir (long-term storage)
    ├── Logs ────► Loki (log aggregation)
    └── Traces ──► Tempo (trace storage)
                        │
                        ▼
                   Grafana (unified UI)
```

## Prerequisites

- Rancher-managed cluster with at least 4 nodes
- Helm 3.x installed
- kubectl with cluster-admin access
- Object storage (MinIO or cloud)
- 16GB+ RAM cluster capacity

## Step 1: Deploy the Foundation

### Install Rancher Monitoring

```bash
# Install Rancher Monitoring from the Apps catalog

# Or via Helm
helm install rancher-monitoring rancher-charts/rancher-monitoring \
  --namespace cattle-monitoring-system \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=2h \
  --set prometheus.prometheusSpec.retentionSize=4GB
```

### Deploy MinIO for Object Storage

```bash
helm install minio minio/minio \
  --namespace observability \
  --create-namespace \
  --set rootUser=admin \
  --set rootPassword=SecureMinIOPass \
  --set persistence.size=500Gi \
  --set mode=distributed \
  --set replicas=4

# Create required buckets
for BUCKET in loki-chunks tempo-traces mimir-blocks mimir-alertmanager mimir-ruler; do
  kubectl exec -n observability deployment/minio -- \
    mc mb local/$BUCKET
done
```

## Step 2: Deploy Loki (Logs)

```bash
# Deploy Loki with S3 backend
helm install loki grafana/loki \
  --namespace observability \
  --set loki.storage.type=s3 \
  --set loki.storage.s3.endpoint=minio.observability.svc.cluster.local:9000 \
  --set loki.storage.bucketNames.chunks=loki-chunks \
  --set loki.storage.s3.accessKeyId=admin \
  --set loki.storage.s3.secretAccessKey=SecureMinIOPass \
  --set loki.storage.s3.s3ForcePathStyle=true \
  --set loki.storage.s3.insecure=true

# Deploy Promtail log collector
helm install promtail grafana/promtail \
  --namespace observability \
  --set config.clients[0].url=http://loki.observability.svc.cluster.local:3100/loki/api/v1/push
```

## Step 3: Deploy Tempo (Traces)

```bash
helm install tempo grafana/tempo-distributed \
  --namespace observability \
  --set storage.trace.backend=s3 \
  --set storage.trace.s3.bucket=tempo-traces \
  --set storage.trace.s3.endpoint=minio.observability.svc.cluster.local:9000 \
  --set storage.trace.s3.access_key=admin \
  --set storage.trace.s3.secret_key=SecureMinIOPass \
  --set storage.trace.s3.insecure=true \
  --set distributor.receivers.otlp.protocols.grpc.endpoint=0.0.0.0:4317 \
  --set metricsGenerator.enabled=true \
  --set metricsGenerator.storage.remote_write[0].url=http://rancher-monitoring-prometheus.cattle-monitoring-system.svc.cluster.local:9090/api/v1/write
```

## Step 4: Deploy Mimir (Long-Term Metrics)

```bash
helm install mimir grafana/mimir-distributed \
  --namespace observability \
  --set mimir.structuredConfig.common.storage.backend=s3 \
  --set mimir.structuredConfig.common.storage.s3.endpoint=minio.observability.svc.cluster.local:9000 \
  --set mimir.structuredConfig.common.storage.s3.access_key_id=admin \
  --set mimir.structuredConfig.common.storage.s3.secret_access_key=SecureMinIOPass \
  --set mimir.structuredConfig.common.storage.s3.insecure=true \
  --set mimir.structuredConfig.blocks_storage.s3.bucket_name=mimir-blocks
```

## Step 5: Configure Prometheus Remote Write to Mimir

```yaml
# patch-prometheus.yaml - Add remote write to Mimir
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: rancher-monitoring-prometheus
  namespace: cattle-monitoring-system
spec:
  remoteWrite:
    - url: http://mimir-nginx.observability.svc.cluster.local/api/v1/push
      headers:
        X-Scope-OrgID: rancher-production
      writeRelabelConfigs:
        - sourceLabels: []
          targetLabel: cluster
          replacement: rancher-production
```

## Step 6: Deploy OpenTelemetry Collector

```yaml
# otel-collector-full.yaml - Complete OTel Collector
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: observability
spec:
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
    processors:
      batch:
        timeout: 10s
      memory_limiter:
        limit_mib: 512
      k8sattributes: {}
    exporters:
      otlp/tempo:
        endpoint: tempo-distributor.observability.svc.cluster.local:4317
        tls:
          insecure: true
      otlphttp/loki:
        endpoint: http://loki.observability.svc.cluster.local:3100/otlp
      prometheusremotewrite:
        endpoint: http://mimir-nginx.observability.svc.cluster.local/api/v1/push
        headers:
          X-Scope-OrgID: rancher-production
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp/tempo]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlphttp/loki]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [prometheusremotewrite]
```

## Step 7: Configure Grafana Data Sources

```yaml
# grafana-all-datasources.yaml - All observability data sources
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-all-datasources
  namespace: cattle-monitoring-system
  labels:
    grafana_datasource: "1"
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        uid: prometheus
        url: http://rancher-monitoring-prometheus.cattle-monitoring-system.svc.cluster.local:9090
        isDefault: true
      - name: Mimir
        type: prometheus
        uid: mimir
        url: http://mimir-nginx.observability.svc.cluster.local/prometheus
      - name: Loki
        type: loki
        uid: loki
        url: http://loki.observability.svc.cluster.local:3100
        jsonData:
          derivedFields:
            - datasourceUid: tempo
              matcherRegex: '"trace_id":"(\w+)"'
              name: TraceID
              url: '${__value.raw}'
      - name: Tempo
        type: tempo
        uid: tempo
        url: http://tempo-query-frontend.observability.svc.cluster.local:3200
        jsonData:
          tracesToLogs:
            datasourceUid: loki
          tracesToMetrics:
            datasourceUid: prometheus
          serviceMap:
            datasourceUid: prometheus
```

## Step 8: Verify the Full Stack

```bash
# Check all observability components
kubectl get pods -n observability

# Test metrics flow
kubectl port-forward -n observability svc/mimir-nginx 9090:80 &
curl "http://localhost:9090/prometheus/api/v1/query?query=up" \
  -H "X-Scope-OrgID: rancher-production" | jq '.data.result | length'

# Test log flow
kubectl port-forward -n observability svc/loki 3100:3100 &
curl "http://localhost:3100/loki/api/v1/query?query={namespace=\"observability\"}" | jq '.data.result | length'

# Test trace flow
kubectl port-forward -n observability svc/tempo-query-frontend 3200:3200 &
curl http://localhost:3200/api/echo
```

## Conclusion

A full observability stack on Rancher transforms your Kubernetes environment from a black box into a transparent, debuggable system. The LGTM stack (Loki + Grafana + Tempo + Mimir) provides excellent cost efficiency through object storage and integrates seamlessly with the existing Rancher Monitoring. The key to effective observability is correlation: linking metrics spikes to specific traces and log entries that explain the root cause, which Grafana's unified interface enables out of the box.
