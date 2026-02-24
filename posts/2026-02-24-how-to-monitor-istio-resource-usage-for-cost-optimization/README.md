# How to Monitor Istio Resource Usage for Cost Optimization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Cost Optimization, Prometheus, Grafana

Description: How to build dashboards and alerts that track Istio resource consumption so you can identify waste and optimize costs continuously.

---

You cannot optimize what you do not measure. Before you can reduce Istio costs, you need visibility into exactly where resources are being consumed: which sidecars are over-provisioned, which are under-provisioned, how much the control plane uses, and how your metrics and log storage is growing.

This guide walks through setting up comprehensive Istio cost monitoring using Prometheus and Grafana, two tools most Kubernetes clusters already run.

## Essential Prometheus Queries for Istio Cost Monitoring

All of these queries assume you have the standard Kubernetes metrics (kube-state-metrics and cAdvisor) plus Istio metrics available in Prometheus.

### Sidecar Resource Utilization

The most important thing to track is the gap between what sidecars request and what they actually use. That gap is wasted money.

**CPU utilization ratio (actual usage vs requests):**

```promql
avg(
  rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])
  /
  on(namespace, pod) group_left()
  kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"}
) by (namespace)
```

If this ratio is consistently below 0.3 (30%), your sidecars are over-provisioned by at least 2x.

**Memory utilization ratio:**

```promql
avg(
  container_memory_working_set_bytes{container="istio-proxy"}
  /
  on(namespace, pod) group_left()
  kube_pod_container_resource_requests{container="istio-proxy", resource="memory"}
) by (namespace)
```

Same logic. Below 0.3 means significant waste.

**Total wasted CPU by sidecars (in cores):**

```promql
sum(
  kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"}
  -
  on(namespace, pod) group_left()
  rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])
)
```

Multiply this number by your cost-per-core to get dollars wasted per month.

**Total wasted memory (in GB):**

```promql
sum(
  kube_pod_container_resource_requests{container="istio-proxy", resource="memory"}
  -
  on(namespace, pod) group_left()
  container_memory_working_set_bytes{container="istio-proxy"}
) / 1024 / 1024 / 1024
```

### Control Plane Resource Usage

```promql
# istiod CPU usage
sum(rate(container_cpu_usage_seconds_total{namespace="istio-system", container="discovery"}[5m]))

# istiod memory usage
sum(container_memory_working_set_bytes{namespace="istio-system", container="discovery"})

# xDS push frequency
rate(pilot_xds_pushes[5m])

# xDS push latency (p99)
histogram_quantile(0.99, rate(pilot_xds_push_time_bucket[5m]))
```

### Gateway Resource Usage

```promql
# Ingress gateway CPU
sum(rate(container_cpu_usage_seconds_total{namespace="istio-system", pod=~"istio-ingressgateway.*"}[5m]))

# Ingress gateway memory
sum(container_memory_working_set_bytes{namespace="istio-system", pod=~"istio-ingressgateway.*"})
```

## Building a Cost Dashboard in Grafana

Create a Grafana dashboard with panels organized into these sections.

### Panel 1: Cost Overview

Create a stat panel showing estimated monthly cost:

```promql
# Monthly sidecar CPU cost (assuming $35/core/month)
sum(kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"}) * 35

# Monthly sidecar memory cost (assuming $8.76/GB/month)
sum(kube_pod_container_resource_requests{container="istio-proxy", resource="memory"}) / 1024 / 1024 / 1024 * 8.76
```

### Panel 2: Waste Heatmap

Show a table panel with per-namespace waste:

```promql
# CPU waste per namespace (in millicores)
sum by (namespace) (
  kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"} * 1000
  -
  on(namespace, pod) group_left()
  rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]) * 1000
)
```

Sort by highest waste to quickly identify which namespaces to optimize first.

### Panel 3: Per-Pod Sidecar Usage

A table panel showing individual pod sidecar usage:

```promql
# Top 20 most over-provisioned sidecars by CPU
topk(20,
  kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"}
  -
  on(namespace, pod) group_left()
  rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])
)
```

### Panel 4: Configuration Size Tracking

Track the xDS configuration size, which directly correlates with sidecar memory usage:

```promql
# Number of services known to the control plane
pilot_services

# Number of endpoints
pilot_endpoints

# Configuration push size
pilot_xds_config_size_bytes
```

## Setting Up Cost Alerts

Configure Prometheus alerts that fire when Istio costs drift:

```yaml
groups:
- name: istio-cost-alerts
  rules:
  - alert: HighSidecarWaste
    expr: |
      (
        sum(kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"})
        -
        sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))
      ) / sum(kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"}) > 0.8
    for: 24h
    labels:
      severity: warning
    annotations:
      summary: "Over 80% of sidecar CPU resources are unused for 24h"
      description: "Sidecar CPU utilization is very low. Consider reducing resource requests."

  - alert: SidecarOOMRisk
    expr: |
      max by (namespace, pod) (
        container_memory_working_set_bytes{container="istio-proxy"}
        /
        on(namespace, pod) group_left()
        kube_pod_container_resource_limits{container="istio-proxy", resource="memory"}
      ) > 0.9
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "Sidecar {{ $labels.pod }} approaching memory limit"
      description: "Memory usage is above 90% of the limit. Risk of OOM kill."

  - alert: HighXDSPushRate
    expr: rate(pilot_xds_pushes[5m]) > 10
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "High xDS push rate from istiod"
      description: "Frequent configuration pushes waste control plane CPU and sidecar resources."

  - alert: IstiodHighMemory
    expr: |
      container_memory_working_set_bytes{namespace="istio-system", container="discovery"}
      /
      kube_pod_container_resource_limits{namespace="istio-system", container="discovery", resource="memory"}
      > 0.85
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "istiod memory usage is high"
```

## Tracking Cost Trends Over Time

Use Prometheus recording rules to track cost trends:

```yaml
groups:
- name: istio-cost-recording
  interval: 5m
  rules:
  - record: istio:sidecar_cpu_cost_monthly
    expr: sum(kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"}) * 35

  - record: istio:sidecar_memory_cost_monthly
    expr: sum(kube_pod_container_resource_requests{container="istio-proxy", resource="memory"}) / 1024 / 1024 / 1024 * 8.76

  - record: istio:total_estimated_cost_monthly
    expr: |
      sum(kube_pod_container_resource_requests{container="istio-proxy", resource="cpu"}) * 35
      +
      sum(kube_pod_container_resource_requests{container="istio-proxy", resource="memory"}) / 1024 / 1024 / 1024 * 8.76
      +
      sum(kube_pod_container_resource_requests{namespace="istio-system", resource="cpu"}) * 35
      +
      sum(kube_pod_container_resource_requests{namespace="istio-system", resource="memory"}) / 1024 / 1024 / 1024 * 8.76

  - record: istio:sidecar_count
    expr: count(kube_pod_container_info{container="istio-proxy"})
```

Plot `istio:total_estimated_cost_monthly` over time to see if your costs are trending up, down, or staying flat.

## Automated Reporting

Create a script that generates weekly cost reports:

```bash
#!/bin/bash
# Query Prometheus for Istio cost metrics
PROM_URL="http://prometheus.monitoring:9090"

SIDECAR_CPU_COST=$(curl -s "${PROM_URL}/api/v1/query?query=istio:sidecar_cpu_cost_monthly" | \
  jq -r '.data.result[0].value[1]')

SIDECAR_MEM_COST=$(curl -s "${PROM_URL}/api/v1/query?query=istio:sidecar_memory_cost_monthly" | \
  jq -r '.data.result[0].value[1]')

SIDECAR_COUNT=$(curl -s "${PROM_URL}/api/v1/query?query=istio:sidecar_count" | \
  jq -r '.data.result[0].value[1]')

echo "Weekly Istio Cost Report"
echo "========================"
echo "Sidecar count: ${SIDECAR_COUNT}"
echo "Sidecar CPU cost: \$${SIDECAR_CPU_COST}/month"
echo "Sidecar memory cost: \$${SIDECAR_MEM_COST}/month"
echo "Total estimated: \$$(echo "${SIDECAR_CPU_COST} + ${SIDECAR_MEM_COST}" | bc)/month"
```

Schedule this as a CronJob and send the output to Slack or email.

## What to Optimize First

Based on your monitoring data, prioritize optimizations in this order:

1. **Namespaces with highest waste ratio**: Fix the biggest gaps between requested and actual usage first
2. **High-replica deployments**: A deployment with 50 replicas and over-provisioned sidecars wastes 50x more than one with 2 replicas
3. **Unused Sidecar scoping**: If configuration size is large, add Sidecar resources
4. **Control plane**: Usually a small percentage of total cost, optimize last

## Summary

Cost monitoring for Istio is about making waste visible. Once you can see which namespaces, deployments, and sidecars are over-provisioned, the optimization decisions become obvious. Set up the dashboard, configure alerts for drift, and review cost trends weekly. This turns cost optimization from a one-time project into an ongoing practice that keeps your Istio spend in check.
