# How to Deploy Loki Stack on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Loki, Log Aggregation, Promtail, Grafana, Observability

Description: Deploy the Grafana Loki stack on Rancher with Promtail log collection, object storage backend, and Grafana integration for centralized log management.

## Introduction

Grafana Loki is a horizontally scalable log aggregation system designed to be cost-effective. Unlike Elasticsearch, Loki only indexes log labels (not log content), dramatically reducing storage costs. Promtail ships logs from pods to Loki, and Grafana provides the query interface.

## Prerequisites

- Rancher cluster with `helm` and `kubectl`
- Object storage (S3 or equivalent) for log storage
- Grafana installed

## Step 1: Add Grafana Repository

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

## Step 2: Deploy Loki

```yaml
# loki-values.yaml

loki:
  auth_enabled: false    # Single-tenant mode

  storage:
    type: s3
    bucketNames:
      chunks: loki-chunks
      ruler: loki-ruler
      admin: loki-admin
    s3:
      endpoint: s3.amazonaws.com
      region: us-east-1
      accessKeyId: YOUR_ACCESS_KEY
      secretAccessKey: YOUR_SECRET_KEY

  schemaConfig:
    configs:
      - from: 2024-01-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h

  # Retention
  limits_config:
    retention_period: 744h    # 31 days

singleBinary:
  replicas: 1    # Single binary mode for small clusters
  # Use loki-distributed chart for production

write:
  replicas: 3
read:
  replicas: 3
backend:
  replicas: 3
```

```bash
kubectl create namespace observability

helm install loki grafana/loki \
  --namespace observability \
  --values loki-values.yaml
```

## Step 3: Deploy Promtail

Promtail is the log shipper that runs as a DaemonSet.

```yaml
# promtail-values.yaml
config:
  clients:
    - url: http://loki.observability.svc.cluster.local:3100/loki/api/v1/push

  snippets:
    pipelineStages:
      - cri: {}     # Parse CRI log format
      - labeldrop:
          - filename    # Drop noisy labels
```

```bash
helm install promtail grafana/promtail \
  --namespace observability \
  --values promtail-values.yaml
```

## Step 4: Configure Grafana Data Source

```yaml
datasources:
  - name: Loki
    type: loki
    url: http://loki.observability.svc.cluster.local:3100
    jsonData:
      derivedFields:
        - name: TraceID
          matcherRegex: "traceID=(\\w+)"
          url: "$${__value.raw}"
          datasourceUid: tempo    # Link log lines to Tempo traces
```

## Step 5: Query Logs with LogQL

```logql
# View all error logs from a specific app
{app="myapp", namespace="production"} |= "ERROR"

# Count errors per minute
sum by (pod) (
  rate({app="myapp"} |= "ERROR" [1m])
)

# Extract structured fields from JSON logs
{app="myapp"} | json | duration > 1s
```

## Conclusion

The Loki stack on Rancher provides cost-effective log aggregation. Since Loki only indexes metadata labels, storage costs are 10-50x lower than Elasticsearch for equivalent log volumes. The tight Grafana integration allows jumping from metrics anomalies directly to relevant log lines.
