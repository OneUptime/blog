# How to Monitor Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Monitoring, Prometheus, Hard Way

Description: A guide to monitoring Typha HA health including per-replica connection counts, imbalance detection, and failover alerting in a manually installed Calico cluster.

---

## Introduction

Monitoring a Typha HA deployment requires per-replica metrics rather than aggregate metrics. An aggregate connection count that appears healthy may be hiding a situation where one replica has all connections and another has none. Per-replica monitoring catches distribution problems, replica failures, and imbalance before they affect cluster operations.

## Step 1: Enable Per-Replica Prometheus Metrics

Ensure each Typha replica exposes metrics. The metrics endpoint is on each pod, not aggregated at the Service level.

```bash
# Test metrics access for each replica
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name); do
  echo "=== $pod ==="
  kubectl exec -n calico-system $pod -- \
    wget -qO- http://localhost:9093/metrics | grep typha_connections_active
done
```

## Step 2: Configure ServiceMonitor for Per-Pod Scraping

Standard ServiceMonitors scrape the Service endpoint - for per-pod metrics in a multi-replica deployment, use a PodMonitor.

```bash
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: calico-typha
  namespace: calico-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      k8s-app: calico-typha
  podMetricsEndpoints:
  - port: metrics
    path: /metrics
    interval: 30s
  namespaceSelector:
    matchNames:
    - calico-system
EOF
```

This scrapes each Typha pod individually, giving Prometheus a per-pod time series with the pod name as a label.

## Step 3: Key HA Metrics

| Metric | PromQL | Alert Condition |
|--------|--------|----------------|
| Per-replica connections | `typha_connections_active` (per pod) | Alert if any pod has 0 when cluster has nodes |
| Connection imbalance | `max(typha_connections_active) / min(typha_connections_active)` | Alert if ratio > 2 |
| Replica count | `count(up{job="calico-typha"})` | Alert if less than expected replicas |
| Total connections vs nodes | `sum(typha_connections_active)` vs `count(kube_node_info)` | Alert if < 90% match |

## Step 4: HA-Specific Prometheus Alerts

```yaml
groups:
- name: typha-ha
  rules:
  - alert: TyphaReplicaConnectionImbalance
    expr: |
      max(typha_connections_active) / min(typha_connections_active) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Typha connections are unevenly distributed across replicas"

  - alert: TyphaReplicaDown
    expr: |
      count(up{job="calico-typha"} == 1) < count(up{job="calico-typha"})
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "A Typha replica is down"

  - alert: TyphaReplicaZeroConnections
    expr: |
      min(typha_connections_active) == 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "A Typha replica has zero Felix connections"

  - alert: TyphaHATotalConnectionsLow
    expr: |
      sum(typha_connections_active) < (count(kube_node_info) * 0.9)
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "Total Typha connections significantly less than node count"
```

## Step 5: Grafana HA Dashboard

Create a Grafana dashboard with HA-specific panels:

**Panel: Per-Replica Connection Count**
```promql
typha_connections_active
```
Legend: `{{pod}}`

**Panel: Connection Imbalance Ratio**
```promql
max(typha_connections_active) / min(typha_connections_active)
```
Threshold: Green < 1.5, Yellow 1.5-2, Red > 2

**Panel: Replica Health**
```promql
count(up{job="calico-typha"} == 1)
```
Display as stat with threshold: expected replica count.

**Panel: Total Connections vs Node Count**
```promql
sum(typha_connections_active)
```
Overlay with `count(kube_node_info)`.

## Step 6: Manual HA Health Check Script

```bash
#!/bin/bash
# typha-ha-health.sh

echo "=== Typha HA Health Check ==="
echo "Timestamp: $(date)"

REPLICA_COUNT=$(kubectl get deployment calico-typha -n calico-system -o jsonpath='{.spec.replicas}')
RUNNING_COUNT=$(kubectl get pods -n calico-system -l k8s-app=calico-typha --field-selector=status.phase=Running --no-headers | wc -l)
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)

echo "Expected replicas: $REPLICA_COUNT | Running: $RUNNING_COUNT"
echo "Cluster nodes: $NODE_COUNT"

TOTAL_CONNECTIONS=0
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name); do
  COUNT=$(kubectl exec -n calico-system $pod -- \
    wget -qO- http://localhost:9093/metrics 2>/dev/null | \
    grep typha_connections_active | awk '{print $2}')
  echo "  $pod: $COUNT connections"
  TOTAL_CONNECTIONS=$((TOTAL_CONNECTIONS + COUNT))
done

echo "Total connections: $TOTAL_CONNECTIONS / $NODE_COUNT nodes"
COVERAGE=$((TOTAL_CONNECTIONS * 100 / NODE_COUNT))
echo "Coverage: $COVERAGE%"
[ "$COVERAGE" -ge 90 ] && echo "STATUS: HEALTHY" || echo "STATUS: DEGRADED"
```

## Conclusion

Monitoring Typha HA requires per-replica metrics (not aggregate) to detect imbalance and individual replica failures, PodMonitor configuration for per-pod Prometheus scraping, HA-specific alerts for connection imbalance and zero-connection replicas, and a Grafana dashboard that visualizes the distribution across replicas relative to node count. Combined with an automated health check script, this monitoring suite provides full visibility into the HA deployment's health.
