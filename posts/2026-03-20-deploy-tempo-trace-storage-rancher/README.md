# How to Deploy Tempo on Rancher for Trace Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Grafana Tempo, Distributed Tracing, Observability, Helm, Object Storage

Description: Deploy Grafana Tempo on Rancher for cost-effective trace storage with object storage backend and Grafana integration for trace visualization.

## Introduction

Grafana Tempo is a high-volume distributed tracing backend that requires only object storage (no separate index). Unlike Jaeger with Elasticsearch, Tempo stores traces directly in object storage like S3, making it significantly cheaper to operate at scale.

## Prerequisites

- Rancher cluster with `helm` and `kubectl`
- S3-compatible object storage
- Grafana installed (for visualization)

## Step 1: Add Grafana Repository

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

## Step 2: Create Object Storage Secret

```bash
kubectl get namespace observability >/dev/null 2>&1 || kubectl create namespace observability
kubectl create secret generic tempo-s3-credentials \
  --from-literal=S3_ACCESS_KEY=YOUR_ACCESS_KEY \
  --from-literal=S3_SECRET_KEY=YOUR_SECRET_KEY \
  -n observability
```

## Step 3: Configure Tempo Values

```yaml
# tempo-values.yaml

global:
  extraArgs:
    - "-config.expand-env=true"
  extraEnvFrom:
    - secretRef:
        name: tempo-s3-credentials

storage:
  trace:
    backend: s3
    s3:
      bucket: my-tempo-traces
      endpoint: s3.amazonaws.com
      region: us-east-1
      access_key: ${S3_ACCESS_KEY}
      secret_key: ${S3_SECRET_KEY}

ingester:
  replicas: 3
  config:
    trace_idle_period: 30s
    max_block_bytes: 1073741824   # 1GB blocks

distributor:
  replicas: 2

traces:
  otlp:
    grpc:
      enabled: true
    http:
      enabled: true
  jaeger:
    thriftHttp:
      enabled: true

compactor:
  config:
    compaction:
      block_retention: 168h    # Keep traces for 7 days
```

## Step 4: Deploy Tempo

```bash
helm install tempo grafana/tempo-distributed \
  --namespace observability \
  --values tempo-values.yaml
```

## Step 5: Verify Deployment

```bash
# Check all Tempo components
kubectl get pods -n observability | grep tempo

# Verify ingester is ready
kubectl rollout status statefulset/tempo-ingester -n observability
```

## Step 6: Configure Grafana Data Source

If you provision Grafana data sources from files, add Tempo as a data source for trace visualization:

```yaml
# Grafana data source provisioning file
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    uid: tempo
    access: proxy
    url: http://tempo-query-frontend.observability.svc.cluster.local:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki    # Must match the uid of your Loki data source
        spanStartTimeShift: -2s
        spanEndTimeShift: 2s
        filterByTraceID: true
        filterBySpanID: false
        tags:
          - key: service.name
            value: service_name
          - key: namespace
```

## Step 7: Send Traces via OpenTelemetry

```yaml
# Add this to an existing OTel Collector config to forward traces to Tempo
exporters:
  otlp/tempo:
    endpoint: tempo-distributor.observability.svc.cluster.local:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      exporters: [otlp/tempo]
```

## Conclusion

Grafana Tempo on Rancher provides cost-effective trace storage by eliminating the need for Elasticsearch or Cassandra. Object storage costs are a fraction of block storage, making Tempo economical even at millions of traces per day. The tight Grafana integration enables seamless navigation from metrics to traces to logs.
