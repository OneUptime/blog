# How to Monitor Istio Resource Consumption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Kubernetes, Resource Management, Prometheus

Description: A practical guide to monitoring CPU, memory, and network resource consumption by Istio control plane and sidecar proxies using Prometheus and Grafana.

---

Istio adds resource overhead to your cluster through its control plane components and sidecar proxies. Monitoring that overhead is essential for capacity planning, troubleshooting performance issues, and keeping costs under control. Without proper monitoring, you might not realize that your Istio sidecars are consuming 30% of your cluster's memory until you start running out of resources.

This guide shows you how to set up comprehensive monitoring for Istio's resource consumption.

## What to Monitor

There are two categories of Istio resource consumption:

1. **Control plane**: istiod, ingress/egress gateways. These are dedicated pods in the istio-system namespace.
2. **Data plane**: Envoy sidecar proxies running in every application pod. This is where most of the aggregate resource usage comes from.

## Checking Resource Usage with kubectl

The quickest way to check current resource usage:

```bash
# Control plane resource usage
kubectl top pods -n istio-system

# Sidecar resource usage in a specific namespace
kubectl top pods -n my-namespace --containers | grep istio-proxy

# Total sidecar resource usage across all namespaces
kubectl top pods -A --containers | grep istio-proxy | awk '{sum_cpu+=$3; sum_mem+=$4} END {print "Total CPU:", sum_cpu"m", "Total Memory:", sum_mem"Mi"}'
```

## Setting Up Prometheus Metrics

Istio exposes metrics through both the control plane and the sidecars. Make sure your Prometheus is scraping both.

For the control plane, istiod exposes metrics on port 15014:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istiod-monitor
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
    - istio-system
  selector:
    matchLabels:
      app: istiod
  endpoints:
  - port: http-monitoring
    path: /metrics
    interval: 30s
```

## Key Prometheus Queries for Control Plane

### Istiod Memory Usage

```promql
container_memory_working_set_bytes{namespace="istio-system", container="discovery"}
```

### Istiod CPU Usage

```promql
rate(container_cpu_usage_seconds_total{namespace="istio-system", container="discovery"}[5m])
```

### Istiod Configuration Push Rate

```promql
rate(pilot_xds_pushes{type="cds"}[5m])
```

### Number of Connected Sidecars

```promql
pilot_xds_connected_clients
```

### Configuration Push Latency

```promql
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

## Key Prometheus Queries for Data Plane

### Total Sidecar Memory Across the Cluster

```promql
sum(container_memory_working_set_bytes{container="istio-proxy"})
```

### Sidecar Memory by Namespace

```promql
sum(container_memory_working_set_bytes{container="istio-proxy"}) by (namespace)
```

### Sidecar CPU Usage by Namespace

```promql
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (namespace)
```

### Sidecar Memory as Percentage of Limit

```promql
container_memory_working_set_bytes{container="istio-proxy"}
/ container_spec_memory_limit_bytes{container="istio-proxy"} * 100
```

### Top 10 Sidecar Memory Consumers

```promql
topk(10, container_memory_working_set_bytes{container="istio-proxy"})
```

## Setting Up Grafana Dashboards

Istio ships with pre-built Grafana dashboards. If you are using the istio addons, deploy them:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
```

For a custom dashboard focused on resource consumption, create a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-resource-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  istio-resources.json: |
    {
      "dashboard": {
        "title": "Istio Resource Consumption",
        "panels": [
          {
            "title": "Total Sidecar Memory",
            "type": "stat",
            "targets": [
              {
                "expr": "sum(container_memory_working_set_bytes{container=\"istio-proxy\"}) / 1073741824",
                "legendFormat": "Total GiB"
              }
            ]
          },
          {
            "title": "Total Sidecar CPU",
            "type": "stat",
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{container=\"istio-proxy\"}[5m]))",
                "legendFormat": "Total Cores"
              }
            ]
          },
          {
            "title": "Sidecar Memory by Namespace",
            "type": "timeseries",
            "targets": [
              {
                "expr": "sum(container_memory_working_set_bytes{container=\"istio-proxy\"}) by (namespace) / 1073741824",
                "legendFormat": "{{namespace}}"
              }
            ]
          }
        ]
      }
    }
```

## Monitoring Envoy Internal Metrics

Each sidecar exposes its own metrics. These are useful for understanding individual sidecar behavior:

```bash
# Check a specific sidecar's memory allocation
kubectl exec -n my-namespace deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep server.memory

# Check connection counts
kubectl exec -n my-namespace deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep cx_active

# Check configuration size (this affects memory)
kubectl exec -n my-namespace deploy/my-service -c istio-proxy -- \
  pilot-agent request GET config_dump | wc -c
```

The config dump size is a good proxy for understanding why a sidecar uses a lot of memory. A sidecar that has the full mesh configuration pushed to it will have a much larger config dump than one with a restricted Sidecar resource.

## Alerting on Resource Issues

Set up alerts to catch problems before they cause outages:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-resource-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-control-plane
    rules:
    - alert: IstiodHighMemory
      expr: |
        container_memory_working_set_bytes{namespace="istio-system", container="discovery"}
        / container_spec_memory_limit_bytes{namespace="istio-system", container="discovery"} > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "istiod memory usage is above 80% of limit"
    - alert: IstiodOOMKilled
      expr: |
        kube_pod_container_status_restarts_total{namespace="istio-system", container="discovery"}
        - kube_pod_container_status_restarts_total{namespace="istio-system", container="discovery"} offset 1h > 0
      labels:
        severity: critical
      annotations:
        summary: "istiod has restarted in the last hour, possibly OOMKilled"
  - name: istio-data-plane
    rules:
    - alert: SidecarMemoryNearLimit
      expr: |
        container_memory_working_set_bytes{container="istio-proxy"}
        / container_spec_memory_limit_bytes{container="istio-proxy"} > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio sidecar memory usage above 90% for pod {{ $labels.pod }}"
    - alert: TotalSidecarMemoryHigh
      expr: |
        sum(container_memory_working_set_bytes{container="istio-proxy"}) / 1073741824 > 50
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Total sidecar memory across cluster exceeds 50 GiB"
```

## Tracking Resource Trends

For capacity planning, track resource consumption over time. These Prometheus recording rules help:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-resource-recording
  namespace: monitoring
spec:
  groups:
  - name: istio-resource-recording
    interval: 5m
    rules:
    - record: istio:sidecar_memory_total:sum
      expr: sum(container_memory_working_set_bytes{container="istio-proxy"})
    - record: istio:sidecar_cpu_total:sum
      expr: sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))
    - record: istio:sidecar_count:sum
      expr: count(container_memory_working_set_bytes{container="istio-proxy"})
    - record: istio:sidecar_memory_per_pod:avg
      expr: avg(container_memory_working_set_bytes{container="istio-proxy"})
```

These recording rules let you query historical trends like "how has average sidecar memory usage changed over the last 30 days?"

## Resource Monitoring Checklist

Here is a quick checklist for comprehensive Istio resource monitoring:

```bash
# 1. Check current control plane resource usage
kubectl top pods -n istio-system

# 2. Check total sidecar resource footprint
kubectl top pods -A --containers | grep istio-proxy | wc -l

# 3. Check for any OOMKilled sidecars
kubectl get pods -A -o json | jq '.items[] | select(.status.containerStatuses[]? | select(.name=="istio-proxy" and .lastState.terminated.reason=="OOMKilled")) | .metadata.name'

# 4. Check istiod push errors
kubectl logs -n istio-system deploy/istiod | grep "push error" | tail -5

# 5. Check connected sidecars
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_xds
```

## Summary

Monitoring Istio resource consumption requires tracking both the control plane (istiod, gateways) and the data plane (sidecar proxies). Use `kubectl top` for quick checks, Prometheus queries for detailed analysis, and Grafana dashboards for ongoing visibility. Set up alerts for high memory usage, OOMKilled restarts, and total cluster-wide sidecar resource consumption. Track trends over time to anticipate capacity needs before they become emergencies.
