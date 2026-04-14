# How to Send Dapr Logs to Grafana Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Grafana, Loki, Logging, Kubernetes

Description: Learn how to ship Dapr sidecar and application logs to Grafana Loki using Promtail or Alloy for log aggregation alongside Prometheus metrics.

---

## Overview

Grafana Loki is a log aggregation system designed to work alongside Prometheus. Because both use label-based querying, sending Dapr logs to Loki lets you correlate log events with Dapr metrics on the same Grafana dashboards without switching tools.

## Installing Loki and Promtail

Deploy Loki and Promtail using the Grafana Helm chart:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install loki-stack grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set loki.enabled=true \
  --set promtail.enabled=true \
  --set grafana.enabled=true
```

## Configuring Promtail for Dapr Logs

Customize the Promtail configuration to parse Dapr JSON logs and extract useful labels:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: monitoring
data:
  promtail.yaml: |
    server:
      http_listen_port: 3101
      grpc_listen_port: 0

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki-stack.monitoring.svc:3100/loki/api/v1/push

    scrape_configs:
      - job_name: dapr-containers
        kubernetes_sd_configs:
          - role: pod
        pipeline_stages:
          - cri: {}
          - json:
              expressions:
                level: level
                app_id: app_id
                msg: msg
                instance: instance
          - labels:
              level:
              app_id:
          - output:
              source: msg
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_name]
            action: keep
            regex: daprd
          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
```

## Querying Dapr Logs with LogQL

Use LogQL in Grafana Explore to query Dapr logs:

```bash
# All error logs from Dapr sidecars
{job="dapr-containers", level="error"}

# Filter by app_id
{job="dapr-containers", app_id="order-service"}

# Count errors by app_id in a time range
sum by (app_id) (
  count_over_time({job="dapr-containers", level="error"}[5m])
)

# Extract and filter by message content
{job="dapr-containers"} |= "circuit breaker"

# Parse JSON and filter on a field
{job="dapr-containers"} | json | latencyMs > 500
```

## Adding Loki as a Grafana Data Source

Configure Loki as a data source in Grafana:

```bash
curl -X POST http://admin:admin@loki-stack-grafana.monitoring.svc:3000/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Loki",
    "type": "loki",
    "url": "http://loki-stack.monitoring.svc:3100",
    "access": "proxy",
    "isDefault": false
  }'
```

## Creating a Grafana Dashboard Panel for Dapr Logs

Add a log panel to your Dapr Grafana dashboard:

```json
{
  "type": "logs",
  "title": "Dapr Error Logs",
  "datasource": "Loki",
  "targets": [
    {
      "expr": "{job=\"dapr-containers\", level=\"error\"}",
      "legendFormat": "{{app_id}}"
    }
  ],
  "options": {
    "showTime": true,
    "showLabels": true,
    "wrapLogMessage": false,
    "sortOrder": "Descending"
  }
}
```

## Correlating Logs with Traces

Add a derived field in the Loki data source to link log entries to traces in Grafana Tempo:

```json
{
  "name": "TraceID",
  "matcherRegex": "traceId=(\\w+)",
  "url": "/explore?datasource=Tempo&queries[0].query=${__value.raw}"
}
```

This creates clickable trace links in log lines that contain a `traceId` field.

## Summary

Grafana Loki is the natural complement to Prometheus for Dapr log management. Deploy Loki with Promtail, configure it to parse Dapr JSON log fields into labels, and use LogQL to query and correlate logs with your existing Prometheus metrics dashboards. The unified Grafana experience reduces context switching when investigating Dapr incidents.
