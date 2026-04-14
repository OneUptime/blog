# How to Monitor Dapr Resource Usage for Cost Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Cost, Prometheus, Grafana

Description: Monitor Dapr resource usage for cost optimization by building Prometheus dashboards, tracking per-app sidecar consumption, and identifying waste using Kubecost and metrics.

---

## Building a Cost-Aware Dapr Monitoring Setup

Cost optimization starts with visibility. Without knowing which Dapr-enabled services consume the most resources, optimization is guesswork. A combination of Kubernetes resource metrics, Dapr-specific Prometheus metrics, and cost allocation tools provides the visibility needed.

## Step 1 - Collect Dapr Metrics with Prometheus

Ensure Dapr metrics are scraped by Prometheus. Dapr exposes metrics on port 9090 by default:

```yaml
# prometheus-dapr-scrape.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-sidecar-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: dapr-metrics
    path: /metrics
    interval: 30s
```

Or use Prometheus annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
```

## Step 2 - Key Metrics to Track

Track these Dapr metrics for cost optimization:

```text
# Request rate per app - identifies high-traffic apps needing more resources
sum by (app_id, namespace) (
  rate(dapr_http_server_request_count[5m])
)

# Component operation rate - identifies expensive state/pubsub usage
sum by (app_id, component, operation) (
  rate(dapr_component_state_count[5m])
)

# Sidecar CPU usage by app
sum by (pod) (
  rate(container_cpu_usage_seconds_total{container="daprd"}[5m])
)

# Sidecar memory usage by app
sum by (pod) (
  container_memory_working_set_bytes{container="daprd"}
)
```

## Step 3 - Build a Cost Optimization Grafana Dashboard

Create a dashboard row for identifying waste:

```json
{
  "title": "Dapr Sidecar Resource vs Allocation",
  "panels": [
    {
      "title": "CPU Utilization (Actual vs Limit)",
      "targets": [
        {
          "expr": "rate(container_cpu_usage_seconds_total{container='daprd'}[5m]) / (container_spec_cpu_quota{container='daprd'} / container_spec_cpu_period{container='daprd'}) * 100",
          "legendFormat": "{{pod}}"
        }
      ]
    },
    {
      "title": "Memory Utilization (Actual vs Limit)",
      "targets": [
        {
          "expr": "container_memory_working_set_bytes{container='daprd'} / container_spec_memory_limit_bytes{container='daprd'} * 100",
          "legendFormat": "{{pod}}"
        }
      ]
    }
  ]
}
```

Low utilization (under 20%) indicates over-provisioning and cost waste.

## Step 4 - Use Kubecost for Dollar-Value Attribution

Install Kubecost to get dollar-value cost allocation by container:

```bash
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set kubecostToken="my-token"
```

Query Dapr sidecar cost:

```bash
curl "http://kubecost:9090/model/allocation?window=7d&aggregate=container&filterContainers=daprd" \
  | python3 -m json.tool
```

## Step 5 - Identify and Fix Waste

Use this query to find sidecars with very low CPU utilization:

```text
# Sidecars using less than 5% of their CPU limit
(
  rate(container_cpu_usage_seconds_total{container="daprd"}[1h])
  / (container_spec_cpu_quota{container="daprd"} / container_spec_cpu_period{container="daprd"})
) < 0.05
```

For each pod returned, reduce the CPU limit to 2-3x the actual usage:

```bash
# Update deployment annotation
kubectl patch deployment my-service -n default \
  --type=json \
  -p='[{"op": "add", "path": "/spec/template/metadata/annotations/dapr.io~1sidecar-cpu-limit", "value": "200m"}]'
```

## Step 6 - Set Cost Alerts

Alert when sidecar costs exceed a threshold:

```yaml
- alert: DaprSidecarCostHigh
  expr: |
    sum(
      rate(container_cpu_usage_seconds_total{container="daprd"}[1h])
    ) * 24 * 30 * 0.05 > 100
  labels:
    severity: warning
  annotations:
    summary: "Dapr sidecar CPU cost exceeds $100/month"
```

## Summary

Monitoring Dapr resource usage for cost optimization requires Prometheus-scraped sidecar metrics, Grafana dashboards showing actual vs. allocated CPU and memory, and Kubecost for dollar-value cost attribution. Identify over-provisioned sidecars using low utilization queries and reduce their limits proportionally. Set cost alerts to catch new sources of waste as deployments scale.
