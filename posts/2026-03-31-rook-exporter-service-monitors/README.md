# How to Configure Exporter Service Monitors in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Monitoring, Kubernetes

Description: Configure ServiceMonitors for Rook-Ceph exporter endpoints including the Ceph exporter and node-level metrics for complete cluster visibility.

---

## Overview

Rook-Ceph exposes metrics through multiple endpoints beyond the MGR Prometheus module. The Ceph exporter provides additional per-OSD and per-daemon metrics via dedicated per-node pods. Configuring separate ServiceMonitors for each exporter ensures full coverage in your Prometheus monitoring stack.

## Ceph Exporter Architecture

Rook deploys dedicated per-node `rook-ceph-exporter` pods that run alongside OSD pods to collect fine-grained performance counters. The exporter listens on port 9926 by default.

Check the exporter pods:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-exporter
kubectl get svc -n rook-ceph | grep exporter
```

## Create a ServiceMonitor for the Ceph Exporter

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-exporter
  namespace: rook-ceph
  labels:
    team: rook
spec:
  namespaceSelector:
    matchNames:
      - rook-ceph
  selector:
    matchLabels:
      app: rook-ceph-exporter
  endpoints:
  - port: ceph-exporter-http-metrics
    path: /metrics
    interval: 15s
    scheme: http
    relabelings:
    - sourceLabels: [__meta_kubernetes_pod_node_name]
      targetLabel: node
```

```bash
kubectl apply -f ceph-exporter-monitor.yaml
```

## ServiceMonitor for MGR Module Metrics

The MGR exposes additional module-specific metrics on a separate port:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr-modules
  namespace: rook-ceph
  labels:
    team: rook
spec:
  namespaceSelector:
    matchNames:
      - rook-ceph
  selector:
    matchLabels:
      app: rook-ceph-mgr
  endpoints:
  - port: http-metrics
    path: /metrics
    interval: 5s
```

## Add Node Metadata Relabeling

Enrich exporter metrics with node labels to correlate storage performance with infrastructure:

```yaml
endpoints:
- port: ceph-exporter-http-metrics
  path: /metrics
  interval: 15s
  relabelings:
  - sourceLabels: [__meta_kubernetes_pod_node_name]
    targetLabel: kubernetes_node
  - sourceLabels: [__meta_kubernetes_namespace]
    targetLabel: namespace
  - sourceLabels: [__meta_kubernetes_pod_name]
    targetLabel: pod
```

## Verify Exporter Targets in Prometheus

Check that Prometheus has picked up the exporter targets:

```bash
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
curl -s 'http://localhost:9090/api/v1/targets' | jq '.data.activeTargets[] | select(.labels.job | test("rook")) | .health'
```

Query an exporter-specific metric:

```bash
curl -s 'http://localhost:9090/api/v1/query?query=ceph_osd_op_r_latency_sum' | jq '.data.result | length'
```

## Troubleshoot Missing Metrics

If exporter metrics are not appearing:

```bash
# Check exporter is running and exposing metrics
kubectl exec -n rook-ceph -l app=rook-ceph-exporter -- \
  curl -s http://localhost:9926/metrics | head -20

# Check ServiceMonitor is selected by Prometheus
kubectl get prometheusrule,servicemonitor -n rook-ceph
```

## Summary

Configuring ServiceMonitors for the Rook-Ceph exporter provides granular per-OSD and per-daemon metrics beyond what the MGR Prometheus module offers. Adding node metadata relabeling correlates storage performance with specific hardware nodes, enabling precise capacity planning and performance troubleshooting.
