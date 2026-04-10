# How to Set Up CSI Liveness Metrics in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CSI, Helm, Monitoring

Description: Enable and configure CSI liveness probe metrics in the Rook-Ceph Helm chart to expose Prometheus metrics for monitoring driver health.

---

## Overview

Rook-Ceph CSI drivers expose liveness metrics via a Prometheus endpoint. These metrics report the health and call statistics of the CSI driver, helping you detect provisioning failures early. The Helm chart controls whether liveness metrics are enabled and on which ports they are exposed.

## Enabling Liveness Metrics

In the operator chart values, enable the liveness metrics sidecar:

```yaml
csi:
  enableLiveness: true

  # Metrics port for the RBD plugin
  rbdLivenessMetricsPort: 9080

  # Metrics port for the CephFS plugin
  cephfsLivenessMetricsPort: 9081
```

Port numbers must not conflict with other services running on cluster nodes. The default ports (9080, 9081) are commonly available.

## Applying the Configuration

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set csi.enableLiveness=true \
  --set csi.rbdLivenessMetricsPort=9080 \
  --set csi.cephfsLivenessMetricsPort=9081
```

After applying, verify the liveness container appears in CSI plugin pods:

```bash
kubectl get pod -n rook-ceph -l app=csi-rbdplugin \
  -o jsonpath='{.items[0].spec.containers[*].name}'
```

You should see `liveness-prometheus` in the container list.

## Scraping Metrics with Prometheus

Create a ServiceMonitor or add a Prometheus scrape config targeting the liveness ports:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-csi-metrics
  namespace: rook-ceph
spec:
  endpoints:
    - port: csi-http-metrics
      path: /metrics
      interval: 30s
  selector:
    matchLabels:
      app: csi-metrics
```

Or add a static scrape config directly to Prometheus:

```yaml
scrape_configs:
  - job_name: rook-csi-rbdplugin
    static_configs:
      - targets:
          - node1:9080
          - node2:9080
```

## Key Metrics to Monitor

Test the metrics endpoint manually from a cluster node:

```bash
curl http://localhost:9080/metrics | grep csi_liveness
```

Important metrics include:

```text
csi_liveness - Reports 1 (alive) or 0 (dead) per driver
```

## Alerting on CSI Liveness

Create a Prometheus alert rule for driver failures:

```yaml
groups:
  - name: rook-csi
    rules:
      - alert: RookCSIDriverDown
        expr: csi_liveness == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Rook CSI driver is reporting liveness failure"
```

## Summary

Enabling CSI liveness metrics in the Rook Helm chart adds Prometheus-compatible health reporting to each CSI node plugin. Configure the metrics ports, create ServiceMonitors for collection, and set up alerts so that CSI driver failures are detected before they impact workloads attempting to mount or provision volumes.
