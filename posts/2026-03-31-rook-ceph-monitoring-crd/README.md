# How to Configure Ceph Monitoring in the CephCluster CRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Monitoring, Prometheus, Storage

Description: Configure the monitoring section of the CephCluster CRD to enable Prometheus metrics, create ServiceMonitor resources, and integrate with an existing monitoring stack.

---

## Monitoring Architecture in Rook-Ceph

When monitoring is enabled in the CephCluster, the Ceph MGR module exposes metrics on a dedicated port, and Rook creates Prometheus ServiceMonitor resources that the Prometheus Operator scrapes automatically.

```mermaid
flowchart LR
    MGR["rook-ceph-mgr\n:9283/metrics"]
    SM["ServiceMonitor\n(created by Rook)"]
    Prometheus["Prometheus Operator"]
    Grafana["Grafana Dashboards"]

    SM -->|selects| MGR
    Prometheus -->|watches| SM
    Prometheus -->|scrapes| MGR
    Prometheus --> Grafana
```

## Basic Monitoring Configuration

Enable monitoring in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v19.2.0
  dataDirHostPath: /var/lib/rook
  monitoring:
    enabled: true
    metricsDisabled: false
```

When `monitoring.enabled: true`, Rook:
1. Enables the Ceph MGR prometheus module
2. Creates a Service exposing metrics on port 9283
3. Creates a ServiceMonitor CRD for the Prometheus Operator

## Prerequisites

The monitoring section requires the Prometheus Operator to be installed in the cluster. Verify it is present:

```bash
kubectl get crd servicemonitors.monitoring.coreos.com
kubectl get crd prometheusrules.monitoring.coreos.com
```

If not installed, deploy the kube-prometheus-stack or the Prometheus Operator directly:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

## Viewing the Created ServiceMonitor

After enabling monitoring:

```bash
kubectl -n rook-ceph get servicemonitor
```

Inspect the Rook-created ServiceMonitor:

```bash
kubectl -n rook-ceph get servicemonitor rook-ceph-mgr -o yaml
```

## Disabling Certain Metrics

To reduce cardinality in large clusters, disable Prometheus metrics collection from the MGR module and Ceph exporter:

```yaml
spec:
  monitoring:
    enabled: true
    metricsDisabled: true
```

To disable all Prometheus metrics from the dashboard (but keep the dashboard itself):

```yaml
spec:
  dashboard:
    enabled: true
  monitoring:
    enabled: false
```

## Verify Metrics are Being Scraped

Check the MGR metrics endpoint directly:

```bash
kubectl -n rook-ceph port-forward svc/rook-ceph-mgr 9283:9283 &
curl -s http://localhost:9283/metrics | grep ceph_health_status
```

You should see `ceph_health_status` with a value of `0` (OK), `1` (WARN), or `2` (ERROR).

## PrometheusRule for Ceph Alerts

Rook provides ready-to-use alerting rules:

```bash
kubectl apply -f rook/deploy/examples/monitoring/localrules.yaml
```

This creates PrometheusRule resources with alerts like:

- `CephHealthError` - Cluster health is ERROR
- `CephOSDDown` - One or more OSDs are down
- `CephMonDownQuorumAtRisk` - Monitor quorum is at risk due to monitors being down
- `CephOSDNearFull` - One or more OSDs are approaching full capacity

View created rules:

```bash
kubectl -n rook-ceph get prometheusrule
```

## Grafana Dashboard Import

Import Ceph Grafana dashboards using the official dashboard IDs:

```bash
# In Grafana UI, import these dashboard IDs from grafana.com:
# 2842 - Ceph Cluster
# 5336 - Ceph OSD
# 5342 - Ceph Pool
```

The pre-built dashboard JSON files are available in the Rook repository:

```bash
ls rook/deploy/examples/monitoring/grafana/
# Ceph Cluster Dashboard.json
# Ceph OSD Single Dashboard.json
# Ceph Pools Dashboard.json
```

## Monitoring Rook Operator Metrics

The Rook operator can expose its own controller-runtime metrics, but this is disabled by default. To enable it, set `ROOK_OPERATOR_METRICS_BIND_ADDRESS` to `:8080` in the operator ConfigMap. Once enabled:

```bash
kubectl -n rook-ceph port-forward deploy/rook-ceph-operator 8080:8080 &
curl -s http://localhost:8080/metrics | grep rook_
```

## Summary

Enable Ceph monitoring in the CephCluster CRD with `monitoring.enabled: true` and `metricsDisabled: false`. Rook automatically enables the Ceph MGR Prometheus module, creates a metrics service on port 9283, and creates a ServiceMonitor for the Prometheus Operator. Apply the bundled PrometheusRule manifest for Ceph health alerts, and import Grafana dashboard IDs 2842, 5336, and 5342 for cluster, OSD, and pool visualization.
