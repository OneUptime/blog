# How to Monitor and Alert on Istio Resource Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Alerting, Prometheus, Grafana

Description: Complete guide to setting up monitoring dashboards and alerts for Istio control plane and sidecar proxy resource usage with Prometheus and Grafana.

---

Monitoring Istio resource usage is not just about knowing how much CPU and memory the mesh consumes. It is about catching problems before they impact your services. An OOMKilled sidecar means dropped requests. An overwhelmed istiod means configuration updates stop propagating. Both scenarios lead to outages that are hard to debug if you are not watching the right metrics.

This guide covers the full monitoring and alerting setup for Istio resource usage using Prometheus and Grafana.

## What to Monitor

The monitoring strategy breaks down into three areas:

1. **Control plane health**: Is istiod healthy? Can it keep up with configuration changes?
2. **Sidecar resource consumption**: Are sidecars staying within their limits? Is aggregate consumption reasonable?
3. **Resource efficiency**: Are you over-allocating or under-allocating resources?

## Setting Up Prometheus for Istio Metrics

If you are using the Istio addon Prometheus, deploy it:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
```

For an existing Prometheus installation, add scrape configs for Istio:

```yaml
# prometheus-configmap addition
scrape_configs:
- job_name: 'istiod'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - istio-system
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: keep
    regex: istiod
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    target_label: __address__
    regex: (.+)
    replacement: $1:15014

- job_name: 'envoy-stats'
  metrics_path: /stats/prometheus
  kubernetes_sd_configs:
  - role: pod
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_container_port_name]
    action: keep
    regex: '.*-envoy-prom'
```

## Key Control Plane Metrics

### Istiod Memory and CPU

```promql
# Istiod memory usage
container_memory_working_set_bytes{namespace="istio-system", container="discovery"}

# Istiod CPU usage (cores)
rate(container_cpu_usage_seconds_total{namespace="istio-system", container="discovery"}[5m])

# Memory usage as percentage of limit
container_memory_working_set_bytes{namespace="istio-system", container="discovery"}
/ container_spec_memory_limit_bytes{namespace="istio-system", container="discovery"} * 100
```

### Configuration Push Health

```promql
# Push rate by type
sum(rate(pilot_xds_pushes[5m])) by (type)

# Push errors
sum(rate(pilot_xds_push_errors[5m]))

# Configuration convergence time (p99)
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# Connected sidecars
pilot_xds_connected_clients
```

### Gateway Resources

```promql
# Ingress gateway memory
container_memory_working_set_bytes{namespace="istio-system", container="istio-proxy", pod=~"istio-ingressgateway.*"}

# Ingress gateway CPU
rate(container_cpu_usage_seconds_total{namespace="istio-system", container="istio-proxy", pod=~"istio-ingressgateway.*"}[5m])
```

## Key Data Plane Metrics

### Aggregate Sidecar Resources

```promql
# Total sidecar memory cluster-wide (GiB)
sum(container_memory_working_set_bytes{container="istio-proxy"}) / 1073741824

# Total sidecar CPU (cores)
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))

# Sidecar count
count(container_memory_working_set_bytes{container="istio-proxy"})

# Average memory per sidecar (MiB)
avg(container_memory_working_set_bytes{container="istio-proxy"}) / 1048576
```

### Per-Namespace Breakdown

```promql
# Sidecar memory by namespace
sum(container_memory_working_set_bytes{container="istio-proxy"}) by (namespace) / 1048576

# Sidecar CPU by namespace
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (namespace)
```

### Resource Limit Proximity

```promql
# Sidecars near their memory limit (above 80%)
(container_memory_working_set_bytes{container="istio-proxy"}
/ container_spec_memory_limit_bytes{container="istio-proxy"}) > 0.8

# Sidecars being CPU throttled
rate(container_cpu_cfs_throttled_seconds_total{container="istio-proxy"}[5m])
```

## Alert Configuration

### Critical Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-resource-critical
  namespace: monitoring
spec:
  groups:
  - name: istio-critical
    rules:
    - alert: IstiodDown
      expr: absent(up{job="istiod"} == 1)
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "istiod is not running"

    - alert: IstiodOOMRestart
      expr: |
        increase(kube_pod_container_status_restarts_total{
          namespace="istio-system",
          container="discovery"
        }[30m]) > 0
      labels:
        severity: critical
      annotations:
        summary: "istiod has restarted, possible OOMKill"

    - alert: IngressGatewayDown
      expr: |
        kube_deployment_status_replicas_available{
          namespace="istio-system",
          deployment="istio-ingressgateway"
        } == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "No ingress gateway replicas available"
```

### Warning Alerts

```yaml
    - alert: IstiodHighMemory
      expr: |
        container_memory_working_set_bytes{namespace="istio-system", container="discovery"}
        / container_spec_memory_limit_bytes{namespace="istio-system", container="discovery"} > 0.75
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "istiod memory at {{ $value | humanizePercentage }}"

    - alert: SidecarMemoryNearLimit
      expr: |
        container_memory_working_set_bytes{container="istio-proxy"}
        / container_spec_memory_limit_bytes{container="istio-proxy"} > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Sidecar in {{ $labels.namespace }}/{{ $labels.pod }} near memory limit"

    - alert: HighSidecarCPUThrottling
      expr: |
        rate(container_cpu_cfs_throttled_seconds_total{container="istio-proxy"}[5m])
        / rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]) > 0.5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Sidecar in {{ $labels.pod }} is heavily CPU throttled"

    - alert: XDSPushErrors
      expr: sum(rate(pilot_xds_push_errors[5m])) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "istiod is experiencing xDS push errors"

    - alert: TotalSidecarMemoryHigh
      expr: |
        sum(container_memory_working_set_bytes{container="istio-proxy"}) / 1073741824 > 100
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Total sidecar memory exceeds 100 GiB"
```

## Grafana Dashboard

Create a comprehensive Istio resource dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-resources-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  istio-resources.json: |
    {
      "dashboard": {
        "title": "Istio Resource Usage",
        "refresh": "30s",
        "rows": [
          {
            "title": "Control Plane",
            "panels": [
              {
                "title": "Istiod Memory",
                "type": "timeseries",
                "targets": [{
                  "expr": "container_memory_working_set_bytes{namespace='istio-system', container='discovery'} / 1073741824"
                }]
              },
              {
                "title": "Istiod CPU",
                "type": "timeseries",
                "targets": [{
                  "expr": "rate(container_cpu_usage_seconds_total{namespace='istio-system', container='discovery'}[5m])"
                }]
              },
              {
                "title": "Connected Sidecars",
                "type": "stat",
                "targets": [{
                  "expr": "pilot_xds_connected_clients"
                }]
              }
            ]
          },
          {
            "title": "Data Plane",
            "panels": [
              {
                "title": "Total Sidecar Memory (GiB)",
                "type": "timeseries",
                "targets": [{
                  "expr": "sum(container_memory_working_set_bytes{container='istio-proxy'}) / 1073741824"
                }]
              },
              {
                "title": "Sidecar Memory by Namespace",
                "type": "timeseries",
                "targets": [{
                  "expr": "sum(container_memory_working_set_bytes{container='istio-proxy'}) by (namespace) / 1048576"
                }]
              },
              {
                "title": "Average Memory per Sidecar (MiB)",
                "type": "stat",
                "targets": [{
                  "expr": "avg(container_memory_working_set_bytes{container='istio-proxy'}) / 1048576"
                }]
              }
            ]
          }
        ]
      }
    }
```

## Recording Rules for Efficiency

Pre-compute expensive queries with recording rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-resource-recording-rules
  namespace: monitoring
spec:
  groups:
  - name: istio-resource-recording
    interval: 60s
    rules:
    - record: istio:total_sidecar_memory_bytes:sum
      expr: sum(container_memory_working_set_bytes{container="istio-proxy"})
    - record: istio:total_sidecar_cpu_cores:sum
      expr: sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))
    - record: istio:sidecar_count:total
      expr: count(container_memory_working_set_bytes{container="istio-proxy"})
    - record: istio:avg_sidecar_memory_bytes:avg
      expr: avg(container_memory_working_set_bytes{container="istio-proxy"})
    - record: istio:sidecar_memory_utilization:ratio
      expr: |
        container_memory_working_set_bytes{container="istio-proxy"}
        / container_spec_memory_limit_bytes{container="istio-proxy"}
```

## Quick Health Check Script

For ad-hoc monitoring:

```bash
#!/bin/bash
echo "=== Istio Resource Health Check ==="

echo -e "\n--- Control Plane ---"
kubectl top pods -n istio-system --no-headers 2>/dev/null

echo -e "\n--- Sidecar Stats ---"
TOTAL_SIDECARS=$(kubectl get pods -A -o json | jq '[.items[] | select(.spec.containers[]?.name == "istio-proxy")] | length')
echo "Total sidecars: $TOTAL_SIDECARS"

echo -e "\n--- Top 5 Memory-Consuming Sidecars ---"
kubectl top pods -A --containers --no-headers 2>/dev/null | grep istio-proxy | sort -k4 -rn | head -5

echo -e "\n--- OOMKilled Sidecars (last 24h) ---"
kubectl get events -A --field-selector reason=OOMKilling --sort-by='.lastTimestamp' 2>/dev/null | grep istio-proxy | tail -5
```

## Summary

Effective monitoring and alerting for Istio resources requires tracking both the control plane and data plane. Set up Prometheus to scrape istiod metrics and container resource metrics. Create alerts at multiple severity levels: critical for outages (istiod down, gateway down, OOMKill), and warning for approaching limits (memory above 75-85%, CPU throttling). Use Grafana dashboards for ongoing visibility and recording rules to keep queries efficient. A well-instrumented Istio deployment gives you early warning before resource issues turn into service outages.
