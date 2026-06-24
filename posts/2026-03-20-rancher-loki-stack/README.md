# How to Deploy Loki Stack on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Loki, Log Aggregation, Grafana, Observability

Description: Deploy the Grafana Loki stack on Rancher for scalable, cost-effective log aggregation with Promtail for log collection and Grafana for visualization.

## Introduction

Grafana Loki is a horizontally scalable log aggregation system inspired by Prometheus. Unlike ELK, Loki only indexes metadata (labels) rather than full log content, making it significantly cheaper to operate at scale. This guide covers deploying the complete Loki stack (Loki + Grafana Alloy + Grafana) on Rancher.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- kubectl access
- A StorageClass or object storage backend

## Step 1: Deploy Loki with Helm

```yaml
# loki-values.yaml - Production Loki configuration

loki:
  auth_enabled: false  # Set to true for multi-tenancy

  commonConfig:
    replication_factor: 3

  storage:
    type: s3
    bucketNames:
      chunks: loki-chunks
    s3:
      endpoint: minio.observability.svc.cluster.local:9000
      accessKeyId: minioadmin
      secretAccessKey: minioadmin
      s3ForcePathStyle: true
      insecure: true

  schemaConfig:
    configs:
      - from: 2024-04-01
        store: tsdb
        object_store: s3
        schema: v13
        index:
          prefix: loki_index_
          period: 24h

  limits_config:
    # Retention period
    retention_period: 30d
    # Ingestion rate limit
    ingestion_rate_mb: 16
    ingestion_burst_size_mb: 32
    # Query limits
    max_query_series: 5000
    max_entries_limit_per_query: 50000

  # Compaction
  compactor:
    retention_enabled: true
    retention_delete_delay: 2h
    delete_request_store: s3
    compaction_interval: 10m

  # Ruler for log-based alerting
  rulerConfig:
    enable_api: true
    storage:
      type: local
      local:
        directory: /etc/loki/rules
    alertmanager_url: http://rancher-monitoring-alertmanager.cattle-monitoring-system.svc.cluster.local:9093

deploymentMode: SingleBinary

singleBinary:
  replicas: 3
  persistence:
    enabled: true
    size: 10Gi

# Zero out replica counts for other deployment modes
backend:
  replicas: 0
read:
  replicas: 0
write:
  replicas: 0
ingester:
  replicas: 0
querier:
  replicas: 0
queryFrontend:
  replicas: 0
queryScheduler:
  replicas: 0
distributor:
  replicas: 0
compactor:
  replicas: 0
indexGateway:
  replicas: 0
bloomPlanner:
  replicas: 0
bloomBuilder:
  replicas: 0
bloomGateway:
  replicas: 0

monitoring:
  serviceMonitor:
    enabled: true
    labels:
      release: rancher-monitoring
```

```bash
# Install Loki
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update
helm install loki grafana-community/loki \
  --namespace observability \
  --create-namespace \
  --values loki-values.yaml \
  --wait

# Check status
kubectl get pods -n observability
```

## Step 2: Deploy Grafana Alloy for Log Collection

```yaml
# alloy-values.yaml - Grafana Alloy DaemonSet configuration
controller:
  type: daemonset

alloy:
  mounts:
    varlog: true

  configMap:
    content: |
      discovery.kubernetes "pod" {
        role = "pod"

        selectors {
          role  = "pod"
          field = "spec.nodeName=" + coalesce(sys.env("HOSTNAME"), constants.hostname)
        }
      }

      discovery.relabel "pod_logs" {
        targets = discovery.kubernetes.pod.targets

        rule {
          source_labels = ["__meta_kubernetes_namespace"]
          action        = "replace"
          target_label  = "namespace"
        }

        rule {
          source_labels = ["__meta_kubernetes_pod_name"]
          action        = "replace"
          target_label  = "pod"
        }

        rule {
          source_labels = ["__meta_kubernetes_pod_container_name"]
          action        = "replace"
          target_label  = "container"
        }

        rule {
          source_labels = ["__meta_kubernetes_pod_label_app_kubernetes_io_name"]
          action        = "replace"
          target_label  = "app"
        }

        rule {
          source_labels = ["__meta_kubernetes_pod_node_name"]
          action        = "replace"
          target_label  = "node"
        }
      }

      loki.source.kubernetes "pod_logs" {
        targets    = discovery.relabel.pod_logs.output
        forward_to = [loki.process.pod_logs.receiver]
      }

      loki.process "pod_logs" {
        stage.json {
          expressions = {
            level     = "level"
            timestamp = "timestamp"
            msg       = "msg"
            trace_id  = "trace_id"
          }
        }

        stage.labels {
          values = {
            level = ""
          }
        }

        stage.timestamp {
          source = "timestamp"
          format = "RFC3339"
        }

        stage.match {
          selector = "{level=\"debug\"}"
          action   = "drop"
        }

        forward_to = [loki.write.default.receiver]
      }

      local.file_match "system_logs" {
        path_targets = [{
          __path__ = "/var/log/*.log",
          job      = "varlogs",
          node     = coalesce(sys.env("HOSTNAME"), constants.hostname),
        }]
      }

      loki.source.file "system_logs" {
        targets    = local.file_match.system_logs.targets
        forward_to = [loki.write.default.receiver]
      }

      loki.write "default" {
        endpoint {
          url = "http://loki.observability.svc.cluster.local:3100/loki/api/v1/push"
        }
      }

serviceMonitor:
  enabled: true
  additionalLabels:
    release: rancher-monitoring
```

```bash
# Install Grafana Alloy
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install alloy grafana/alloy \
  --namespace observability \
  --values alloy-values.yaml \
  --wait
```

## Step 3: Configure Grafana Data Source

```yaml
# grafana-loki-datasource.yaml - Loki data source for Grafana
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-loki
  namespace: cattle-monitoring-system
  labels:
    grafana_datasource: "1"
data:
  loki-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        uid: loki
        type: loki
        url: http://loki.observability.svc.cluster.local:3100
        access: proxy
        jsonData:
          maxLines: 1000
          derivedFields:
            # Tempo data source UID must be tempo for this link to resolve
            - datasourceUid: tempo
              matcherRegex: '"trace_id"\s*:\s*"([0-9a-fA-F]+)"'
              name: TraceID
              url: '$${__value.raw}'
```

## Step 4: Write LogQL Queries

LogQL is Loki's query language, similar to PromQL:

```logql
# Query all error logs from production namespace
{namespace="production"} |= "error"

# Filter by multiple labels and level
{namespace="production", app="order-service"} |= "ERROR"

# Parse JSON and filter on structured field
{namespace="production"} | json | level = "error" | line_format "{{.msg}}"

# Count errors per service (metric query)
sum by (app) (
  rate({namespace="production"} |= "ERROR" [5m])
)

# High latency requests (parsing nginx access logs)
{job="nginx-access"}
  | logfmt
  | response_time > 2.0
  | line_format "{{.method}} {{.path}} took {{.response_time}}s"
```

## Step 5: Create Log-Based Alerts

```yaml
# Add to loki-values.yaml - auth_enabled: false uses the single tenant ID "fake"
ruler:
  directories:
    fake:
      log-alerts.yaml: |
        groups:
          - name: log-based-alerts
            rules:
              - alert: HighErrorRateInLogs
                expr: |
                  sum by (app, namespace) (
                    rate({namespace="production"} |= "ERROR" [5m])
                  ) > 10
                for: 5m
                labels:
                  severity: warning
                annotations:
                  summary: "High error rate in {{ $labels.app }} logs"
```

```bash
helm upgrade loki grafana-community/loki \
  --namespace observability \
  --values loki-values.yaml \
  --wait
```

## Step 6: Request Log Deletion

```bash
# Submit a delete request through the Loki delete API
curl -g -X POST \
  'http://loki.observability.svc.cluster.local:3100/loki/api/v1/delete?query={namespace="development"}&start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z'
```

## Troubleshooting

```bash
# Check Loki health
curl http://loki.observability.svc.cluster.local:3100/ready

# Check Alloy logs
kubectl logs -n observability daemonset/alloy --tail=50

# Check ingestion rate
curl http://loki.observability.svc.cluster.local:3100/metrics | \
  grep loki_ingester_streams_created_total
```

## Conclusion

The Loki stack provides a cost-effective, Kubernetes-native log aggregation solution that integrates seamlessly with Rancher's monitoring infrastructure. Its label-based indexing makes it dramatically cheaper than Elasticsearch-based solutions for log storage at scale. When combined with Tempo for traces and Prometheus/Mimir for metrics, Loki completes a full observability stack that enables correlation between logs, metrics, and traces in Grafana.
