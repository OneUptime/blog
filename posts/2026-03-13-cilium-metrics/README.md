# Metrics in Cilium: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Metrics, Prometheus, Observability

Description: Learn how to configure Cilium metrics collection, scrape them with Prometheus, troubleshoot missing metrics, and build comprehensive dashboards for Cilium networking observability.

---

## Introduction

Cilium exposes a rich set of Prometheus metrics from both the Cilium Agent DaemonSet and the Cilium Operator. These metrics provide deep visibility into networking performance, policy enforcement rates, endpoint health, identity management, and eBPF datapath behavior. Properly configured Cilium metrics form the foundation of proactive networking observability and are essential for capacity planning and incident response.

Cilium agents expose metrics on port 9962 by default, while the Cilium Operator exposes its metrics on port 9963. Hubble, when enabled, provides additional metrics on port 9965 through the Hubble Relay. The Prometheus metrics server in each component must be enabled and configured to scrape these endpoints. Cilium provides official Grafana dashboards that visualize these metrics in production-ready format.

This guide covers enabling and configuring metrics, troubleshooting missing or incorrect metrics, validating metric accuracy, and setting up effective monitoring dashboards and alerts.

## Prerequisites

- Cilium installed in Kubernetes
- Prometheus Operator or Prometheus running in the cluster
- `kubectl` with cluster admin access
- Grafana for dashboards (optional)

## Configure Cilium Metrics

Enable metrics in Cilium:

```bash
# Enable agent and operator Prometheus metrics
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set prometheus.enabled=true \
  --set prometheus.port=9962 \
  --set operator.prometheus.enabled=true \
  --set operator.prometheus.port=9963 \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}" \
  --set hubble.metrics.port=9965

# Verify metrics endpoints are exposed
kubectl -n kube-system get svc | grep "prometheus\|metrics"
kubectl -n kube-system port-forward ds/cilium 9962:9962 &
curl -s http://localhost:9962/metrics | head -20
```

Configure Prometheus scraping with ServiceMonitor:

```yaml
# cilium-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cilium-agent
  namespace: kube-system
  labels:
    app: cilium
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  namespaceSelector:
    matchNames:
      - kube-system
  endpoints:
  - port: prometheus
    interval: 30s
    path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cilium-operator
  namespace: kube-system
spec:
  selector:
    matchLabels:
      io.cilium/app: operator
  namespaceSelector:
    matchNames:
      - kube-system
  endpoints:
  - port: prometheus
    interval: 30s
```

```bash
kubectl apply -f cilium-servicemonitor.yaml
```

## Troubleshoot Metrics Issues

Diagnose missing or broken metrics:

```bash
# Check if metrics endpoint is reachable
kubectl -n kube-system port-forward ds/cilium 9962:9962 &
curl -s http://localhost:9962/metrics | wc -l
# Should return several hundred metrics

# If empty: check prometheus is enabled
kubectl -n kube-system get configmap cilium-config -o yaml | grep prometheus

# Check Prometheus can scrape Cilium
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
# Go to http://localhost:9090/targets and look for cilium targets

# Check for scrape errors
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "cilium-agent") | .lastError'

# Diagnose missing Hubble metrics
kubectl -n kube-system port-forward svc/hubble-metrics 9965:9965 &
curl -s http://localhost:9965/metrics | grep hubble
```

Fix common metrics issues:

```bash
# Issue: ServiceMonitor not matching Cilium services
kubectl -n kube-system get svc -l k8s-app=cilium
# Verify labels match ServiceMonitor selector

# Issue: Prometheus not discovering ServiceMonitors
kubectl -n monitoring get prometheuses -o yaml | grep serviceMonitorSelector

# Issue: Metrics port name mismatch
kubectl -n kube-system get svc cilium -o yaml | grep -A 5 "ports:"
# Port name must match ServiceMonitor endpoint port name

# Issue: Hubble metrics not appearing
kubectl -n kube-system exec ds/cilium -- \
  cilium status | grep -i hubble
```

## Validate Metrics Collection

Confirm key metrics are present and accurate:

```bash
# Check essential Cilium agent metrics
METRICS_URL="http://localhost:9962/metrics"
for metric in "cilium_endpoint_count" "cilium_policy_count" "cilium_identity_count" "cilium_drop_count_total"; do
  VALUE=$(curl -s $METRICS_URL | grep "^$metric" | head -1)
  echo "$metric: $VALUE"
done

# Validate metric accuracy
# Compare endpoint count to kubectl count
CILIUM_METRIC=$(curl -s $METRICS_URL | grep "^cilium_endpoint_count" | awk '{print $2}')
KUBECTL_COUNT=$(kubectl get pods -A --no-headers | wc -l)
echo "Cilium metric: $CILIUM_METRIC, kubectl count: $KUBECTL_COUNT"

# Validate drop metrics by generating test traffic
cilium hubble port-forward &
hubble observe --verdict DROPPED --last 100
curl -s $METRICS_URL | grep cilium_drop_count_total
```

## Monitor Cilium with Key Metrics

```mermaid
graph TD
    A[Cilium Agent] -->|Port 9962| B[/metrics endpoint]
    C[Cilium Operator] -->|Port 9963| D[/metrics endpoint]
    E[Hubble] -->|Port 9965| F[/metrics endpoint]
    B -->|Scrape| G[Prometheus]
    D -->|Scrape| G
    F -->|Scrape| G
    G -->|Query| H[Grafana Dashboard]
    G -->|Alert| I[Alertmanager]
```

Essential PromQL queries for Cilium monitoring:

```promql
# Endpoint health status
sum by (state) (cilium_endpoint_state)

# Policy enforcement rate
rate(cilium_policy_verdict_total[5m])

# Drop rate by reason
rate(cilium_drop_count_total[5m]) by (reason, direction)

# Identity count over time
cilium_identity_count

# BPF map pressure (key metric for eBPF health)
cilium_bpf_map_capacity / cilium_bpf_map_ops_total

# Agent memory usage
process_resident_memory_bytes{job="cilium-agent"}

# Endpoint regeneration time
histogram_quantile(0.99, rate(cilium_endpoint_regeneration_time_stats_seconds_bucket[5m]))
```

Create essential alerts:

```yaml
# cilium-alerts.yaml
groups:
  - name: cilium
    rules:
      - alert: CiliumDropRateHigh
        expr: rate(cilium_drop_count_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High packet drop rate in Cilium"
      - alert: CiliumEndpointRegenerationSlow
        expr: histogram_quantile(0.99, rate(cilium_endpoint_regeneration_time_stats_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Cilium endpoint regeneration is slow"
```

## Conclusion

Cilium's metrics provide unparalleled visibility into eBPF-based networking behavior. Enabling Prometheus metrics on both the agent and operator, along with Hubble metrics for flow-level observability, gives you a complete picture of your cluster's networking health. Use the official Cilium Grafana dashboards (available at https://grafana.com/grafana/dashboards/?search=cilium) as a starting point and customize them for your specific environment. The drop rate, endpoint regeneration time, and identity count metrics are the most important indicators of Cilium's operational health.
