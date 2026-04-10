# How to Monitor CSI Liveness Metrics in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Monitoring, Prometheus

Description: Configure and monitor CSI liveness probe metrics in Rook-Ceph to track CSI driver health and detect gRPC endpoint failures.

---

## Overview

Rook CSI drivers expose liveness metrics that indicate whether the CSI gRPC endpoints are responding. Monitoring these metrics is essential for detecting CSI driver hangs or crashes before they impact PVC provisioning or pod scheduling. The liveness sidecar exposes these metrics on a dedicated port.

## Enable CSI Liveness Metrics

Liveness metrics are disabled by default in Rook. Verify whether liveness is enabled and check the port configuration:

```bash
kubectl get configmap rook-ceph-operator-config -n rook-ceph -o yaml | grep -i liveness
```

To explicitly enable or configure the liveness endpoint port:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-operator-config
  namespace: rook-ceph
data:
  CSI_ENABLE_LIVENESS: "true"
  CSI_RBD_LIVENESS_METRICS_PORT: "9080"
  CSI_CEPHFS_LIVENESS_METRICS_PORT: "9081"
```

```bash
kubectl apply -f operator-config.yaml
```

## Check the Liveness Sidecar Ports

Each CSI plugin DaemonSet pod includes a `liveness-prometheus` container:

```bash
kubectl get pods -n rook-ceph -l app=csi-rbdplugin -o jsonpath='{.items[0].spec.containers[*].name}'
```

Look for `liveness-prometheus`. Check its port:

```bash
kubectl describe pods -n rook-ceph -l app=csi-rbdplugin | grep -A5 liveness-prometheus
```

## Scrape Liveness Metrics Manually

Port-forward to a CSI plugin pod and inspect metrics:

```bash
CSI_POD=$(kubectl get pods -n rook-ceph -l app=csi-rbdplugin -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward -n rook-ceph pod/$CSI_POD 9080:9080 &
curl -s http://localhost:9080/metrics
```

Key metrics to look for:

```text
# HELP csi_liveness CSI driver liveness (1 = healthy, 0 = unhealthy)
# TYPE csi_liveness gauge
csi_liveness{driver_name="rook-ceph.rbd.csi.ceph.com"} 1
```

## Create a ServiceMonitor for CSI Liveness

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-csi-liveness
  namespace: rook-ceph
  labels:
    team: rook
spec:
  namespaceSelector:
    matchNames:
      - rook-ceph
  selector:
    matchLabels:
      app: csi-rbdplugin
  endpoints:
  - port: liveness-metrics
    path: /metrics
    interval: 10s
```

```bash
kubectl apply -f csi-liveness-monitor.yaml
```

## Create a Prometheus Alert for CSI Liveness Failures

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: csi-liveness-alerts
  namespace: rook-ceph
spec:
  groups:
  - name: csi-liveness
    rules:
    - alert: RookCSILivenessFailure
      expr: csi_liveness == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Rook CSI liveness probe failing for {{ $labels.driver_name }}"
        description: "CSI driver {{ $labels.driver_name }} liveness probe has been failing for 2 minutes"
```

## Summary

CSI liveness metrics in Rook provide an early warning system for CSI driver health degradation. By enabling the liveness metrics port, creating a ServiceMonitor to scrape it, and defining a PrometheusRule alert on `csi_liveness == 0`, teams can detect and respond to CSI driver issues before they cause PVC provisioning failures or pod scheduling problems.
