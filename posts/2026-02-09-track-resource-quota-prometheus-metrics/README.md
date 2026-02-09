# How to Track Kubernetes Resource Quota Usage with Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, ResourceQuota

Description: Monitor ResourceQuota usage with kube-state-metrics and Prometheus to track namespace resource consumption, set alerts for quota exhaustion, and visualize quota trends with Grafana dashboards.

---

ResourceQuotas prevent namespace resource exhaustion, but without monitoring you won't know when quotas are near limits. Prometheus and kube-state-metrics expose quota metrics for tracking and alerting. This guide shows you how to monitor quota usage effectively.

## Prerequisites

You need:

- Prometheus deployed in your cluster
- kube-state-metrics installed
- ResourceQuotas configured in namespaces

Install kube-state-metrics if missing:

```bash
kubectl apply -f https://github.com/kubernetes/kube-state-metrics/tree/main/examples/standard
```

## Key ResourceQuota Metrics

kube-state-metrics exposes these quota metrics:

- `kube_resourcequota` - Quota specifications and usage
- `kube_resourcequota_created` - Quota creation timestamp

The main metric is `kube_resourcequota` with labels:

- `namespace` - Namespace name
- `resourcequota` - ResourceQuota name
- `resource` - Resource type (cpu, memory, pods)
- `type` - `hard` (limit) or `used` (current usage)

## Basic Quota Usage Query

Check current quota usage:

```promql
kube_resourcequota{type="used"}
```

Check quota limits:

```promql
kube_resourcequota{type="hard"}
```

Calculate usage percentage:

```promql
(kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) * 100
```

## Per-Namespace CPU Quota Usage

Track CPU quota usage for a specific namespace:

```promql
kube_resourcequota{namespace="production", resource="requests.cpu", type="used"}
```

Compare to limit:

```promql
kube_resourcequota{namespace="production", resource="requests.cpu", type="hard"}
```

Calculate percentage:

```promql
(
  kube_resourcequota{namespace="production", resource="requests.cpu", type="used"}
  /
  kube_resourcequota{namespace="production", resource="requests.cpu", type="hard"}
) * 100
```

## Memory Quota Monitoring

Track memory quota:

```promql
kube_resourcequota{resource="requests.memory", type="used"}
```

Convert to GB for readability:

```promql
kube_resourcequota{resource="requests.memory", type="used"} / 1024 / 1024 / 1024
```

## Pod Count Quota

Monitor pod count against quota:

```promql
kube_resourcequota{resource="pods", type="used"}
```

## Creating Prometheus Alerts

Alert when quota exceeds 80%:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: resourcequota-alerts
  namespace: monitoring
spec:
  groups:
  - name: resourcequota
    interval: 30s
    rules:
    - alert: ResourceQuotaNearLimit
      expr: |
        (
          kube_resourcequota{type="used"}
          /
          kube_resourcequota{type="hard"}
        ) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "ResourceQuota {{ $labels.resourcequota }} in namespace {{ $labels.namespace }} is at {{ $value | humanizePercentage }}"
        description: "Resource {{ $labels.resource }} usage is above 80% of quota"
```

Alert when quota is completely exhausted:

```yaml
- alert: ResourceQuotaExhausted
  expr: |
    (
      kube_resourcequota{type="used"}
      /
      kube_resourcequota{type="hard"}
    ) >= 1
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "ResourceQuota {{ $labels.resourcequota }} exhausted in namespace {{ $labels.namespace }}"
    description: "Resource {{ $labels.resource }} is at 100% of quota. New pods will be rejected."
```

## Tracking Quota Changes Over Time

Record quota usage over time:

```yaml
- record: namespace:quota:usage_ratio
  expr: |
    (
      kube_resourcequota{type="used"}
      /
      kube_resourcequota{type="hard"}
    )
```

Query the recorded metric:

```promql
namespace:quota:usage_ratio{namespace="production"}
```

## Multi-Namespace Quota Dashboard

Create a Grafana panel showing quota usage across namespaces:

```promql
# CPU quota usage per namespace
sum by (namespace) (
  kube_resourcequota{resource="requests.cpu", type="used"}
)
```

Or as percentage:

```promql
# Quota usage percentage per namespace
(
  sum by (namespace, resource) (kube_resourcequota{type="used"})
  /
  sum by (namespace, resource) (kube_resourcequota{type="hard"})
) * 100
```

## Grafana Dashboard JSON

Example Grafana panel config:

```json
{
  "targets": [
    {
      "expr": "(kube_resourcequota{type=\"used\"} / kube_resourcequota{type=\"hard\"}) * 100",
      "legendFormat": "{{ namespace }} - {{ resource }}"
    }
  ],
  "title": "ResourceQuota Usage %",
  "type": "graph",
  "yaxes": [
    {
      "format": "percent",
      "max": 100,
      "min": 0
    }
  ]
}
```

## Tracking Quota Violations

ResourceQuota violations appear in events. Export events to Prometheus with event-exporter:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-exporter-cfg
  namespace: monitoring
data:
  config.yaml: |
    receivers:
    - name: prometheus
      prometheus:
        port: 9102
    route:
      routes:
      - match:
        - receiver: prometheus
          reason: "Quota"
```

Query quota violation events:

```promql
kubernetes_events{reason="ExceededQuota"}
```

## Budget Remaining Query

Show how much quota remains:

```promql
# CPU quota remaining
kube_resourcequota{resource="requests.cpu", type="hard"}
-
kube_resourcequota{resource="requests.cpu", type="used"}
```

## Quota Growth Rate

Track how fast quota is being consumed:

```promql
# CPU quota growth rate (cores per hour)
rate(kube_resourcequota{resource="requests.cpu", type="used"}[1h])
```

Predict when quota will be exhausted:

```promql
# Hours until quota exhausted (assuming linear growth)
(
  kube_resourcequota{resource="requests.cpu", type="hard"}
  -
  kube_resourcequota{resource="requests.cpu", type="used"}
)
/
rate(kube_resourcequota{resource="requests.cpu", type="used"}[1h])
```

## Storage Quota Monitoring

Track PVC quota:

```promql
kube_resourcequota{resource="requests.storage", type="used"}
```

Alert on storage quota:

```yaml
- alert: StorageQuotaNearLimit
  expr: |
    (
      kube_resourcequota{resource="requests.storage", type="used"}
      /
      kube_resourcequota{resource="requests.storage", type="hard"}
    ) > 0.9
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Storage quota in namespace {{ $labels.namespace }} at {{ $value | humanizePercentage }}"
```

## Per-Team Quota Reports

If teams map to namespaces, create per-team reports:

```promql
# Team A quota usage
(
  kube_resourcequota{namespace=~"team-a-.*", type="used"}
  /
  kube_resourcequota{namespace=~"team-a-.*", type="hard"}
) * 100
```

## Slack Alerts

Configure Alertmanager to send quota alerts to Slack:

```yaml
route:
  receiver: slack-quota-alerts
  routes:
  - match:
      alertname: ResourceQuotaNearLimit
    receiver: slack-quota-alerts

receivers:
- name: slack-quota-alerts
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#quota-alerts'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## Best Practices

- Set alerts at 80% and 100% quota usage
- Track quota trends over time
- Create per-namespace and cluster-wide dashboards
- Alert different severity levels to different channels
- Record quota history for capacity planning
- Monitor both requests and limits quotas
- Track quota growth rate to predict exhaustion
- Include quota metrics in SLOs

## Real-World Example: Production Monitoring

Complete monitoring setup for production namespaces:

```yaml
# Prometheus recording rules
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-rules
  namespace: monitoring
spec:
  groups:
  - name: quota-recording
    interval: 30s
    rules:
    - record: namespace:quota:cpu_usage_ratio
      expr: |
        (
          kube_resourcequota{resource="requests.cpu", type="used"}
          /
          kube_resourcequota{resource="requests.cpu", type="hard"}
        )
    - record: namespace:quota:memory_usage_ratio
      expr: |
        (
          kube_resourcequota{resource="requests.memory", type="used"}
          /
          kube_resourcequota{resource="requests.memory", type="hard"}
        )
---
# Alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-alerts
  namespace: monitoring
spec:
  groups:
  - name: quota-alerts
    interval: 30s
    rules:
    - alert: CPUQuotaNearLimit
      expr: namespace:quota:cpu_usage_ratio > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "CPU quota at {{ $value | humanizePercentage }} in {{ $labels.namespace }}"
    - alert: MemoryQuotaNearLimit
      expr: namespace:quota:memory_usage_ratio > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Memory quota at {{ $value | humanizePercentage }} in {{ $labels.namespace }}"
    - alert: QuotaExhausted
      expr: |
        (
          kube_resourcequota{type="used"}
          /
          kube_resourcequota{type="hard"}
        ) >= 1
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "{{ $labels.resource }} quota exhausted in {{ $labels.namespace }}"
```

## Conclusion

Monitoring ResourceQuota with Prometheus prevents quota exhaustion surprises. Use kube-state-metrics to expose quota metrics, create alerts at 80% and 100% thresholds, and track quota trends over time. Build Grafana dashboards for visibility and configure Alertmanager to notify teams before quotas are exhausted. Combine quota monitoring with capacity planning to ensure namespaces have appropriate limits. Regular quota reviews prevent both over-provisioning and resource starvation.
