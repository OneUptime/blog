# How to Configure CSI Liveness Sidecar for Prometheus in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Prometheus, Monitoring

Description: Learn how to enable and configure the CSI liveness sidecar in Rook to expose CSI driver health metrics to Prometheus for monitoring.

---

## What Is the CSI Liveness Sidecar

Each Rook CSI driver pod (RBD, CephFS) can run a liveness sidecar container that continuously checks the health of the CSI plugin and exposes a Prometheus metrics endpoint. The sidecar calls the CSI `Probe` RPC to verify the plugin is responsive and exposes a gauge metric indicating health status. This allows Prometheus to alert on CSI plugin failures before they cause workload disruptions.

## Enabling Liveness Metrics via Helm

Enable the liveness sidecar and specify its port via Helm values:

```yaml
csi:
  enableLiveness: true
  rbdLivenessMetricsPort: 9080
  cephfsLivenessMetricsPort: 9081
  provisionerReplicas: 2
```

Apply the values:

```bash
helm upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  -f values.yaml
```

After the upgrade, the CSI pods include the liveness container running on the specified ports.

## Verifying the Liveness Endpoint

Check that the RBD plugin node DaemonSet pods expose the liveness port:

```bash
kubectl -n rook-ceph describe daemonset csi-rbdplugin | grep -A5 "liveness"
```

Test the metrics endpoint from within the cluster:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l app=csi-rbdplugin -o name | head -1) -- \
  wget -qO- http://localhost:9080/metrics
```

Expected output includes:

```text
# HELP csi_liveness Liveness Probe
# TYPE csi_liveness gauge
csi_liveness 1
```

## Creating a ServiceMonitor for Prometheus Operator

Create `ServiceMonitor` resources for each CSI driver:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-csi-rbd-liveness
  namespace: rook-ceph
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: csi-rbdplugin
  namespaceSelector:
    matchNames:
      - rook-ceph
  endpoints:
    - port: csi-http-metrics
      interval: 60s
      path: /metrics
```

The `port: csi-http-metrics` name must match the port name in the CSI DaemonSet Service.

## Setting Up Alerts

Create a PrometheusRule to alert when the CSI liveness probe indicates the driver is unhealthy:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rook-csi-alerts
  namespace: rook-ceph
spec:
  groups:
    - name: rook-csi
      rules:
        - alert: RookCSIRBDLivenessFailure
          expr: csi_liveness == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Rook RBD CSI driver liveness probe is failing"
```

## Summary

The CSI liveness sidecar in Rook exposes a Prometheus gauge metric (`csi_liveness`) about CSI plugin health via configurable ports. Enable it via `csi.enableLiveness: true` in Helm values along with per-driver port settings (`rbdLivenessMetricsPort`, `cephfsLivenessMetricsPort`). Create ServiceMonitors to scrape the liveness endpoints and PrometheusRules to alert on failures. Early detection of CSI driver health issues prevents silent storage problems from reaching running workloads.
