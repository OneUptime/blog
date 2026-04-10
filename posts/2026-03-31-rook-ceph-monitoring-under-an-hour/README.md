# How to Set Up Ceph Monitoring in Under an Hour

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitoring, Prometheus, Grafana

Description: Deploy Ceph monitoring with Prometheus and Grafana using Rook's built-in support for metrics export, dashboards, and alerting rules in under an hour.

---

Ceph ships with Prometheus metrics and pre-built Grafana dashboards. With Rook, enabling monitoring takes only a few YAML changes and a Helm deployment.

## Enable Ceph Metrics Export

In your CephCluster resource, enable the Prometheus metrics endpoint:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  monitoring:
    enabled: true
    rulesNamespace: rook-ceph
```

Apply and verify the metrics service is created:

```bash
kubectl apply -f cephcluster.yaml
kubectl get svc -n rook-ceph | grep metrics
# rook-ceph-mgr-metrics   ClusterIP   ...   9283/TCP
```

## Deploy Prometheus with kube-prometheus-stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set "grafana.enabled=true" \
  --set "prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false"
```

## Create a ServiceMonitor for Ceph

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
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
      interval: 30s
```

```bash
kubectl apply -f servicemonitor.yaml
```

## Import Ceph Grafana Dashboards

Rook provides pre-built dashboards. Apply them from the Rook examples:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/rbac.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/localrules.yaml
```

Import the official Ceph dashboard from Grafana.com (ID: 2842) via the Grafana UI.

## Verify Metrics are Flowing

```bash
# Port forward Prometheus
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring &

# Query a Ceph metric
curl -s "http://localhost:9090/api/v1/query?query=ceph_health_status" | python3 -m json.tool
```

## Set Up a Basic Alert

```yaml
groups:
- name: ceph-health
  rules:
  - alert: CephHealthError
    expr: ceph_health_status == 2
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster in HEALTH_ERR state"
  - alert: CephOSDDown
    expr: ceph_osd_up == 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph OSD {{ $labels.ceph_daemon }} is down"
```

## Summary

Ceph monitoring with Prometheus and Grafana can be deployed in under an hour using Rook's built-in metrics support and the kube-prometheus-stack Helm chart. The key steps are enabling metrics in CephCluster, creating a ServiceMonitor, importing the Grafana dashboards, and setting up alerting rules for HEALTH_ERR and OSD down events.
