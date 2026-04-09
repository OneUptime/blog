# How to Forward Ceph Logs to Grafana Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Loki, Grafana, Logging, Observability

Description: Ship Rook-managed Ceph daemon logs to Grafana Loki using Promtail for label-based log querying and unified observability alongside Prometheus metrics.

---

Grafana Loki is a horizontally scalable log aggregation system designed to work alongside Prometheus. Forwarding Ceph logs to Loki enables unified dashboards that correlate Ceph metrics with log events using the same time range in Grafana.

## Deploy Promtail for Ceph Log Collection

Create a Promtail configuration targeting Ceph pod logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-ceph-config
  namespace: rook-ceph
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0

    positions:
      filename: /tmp/positions.yaml

    clients:
    - url: http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push

    scrape_configs:
    - job_name: ceph-pods
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: [rook-ceph]
      pipeline_stages:
      - cri: {}
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_uid, __meta_kubernetes_pod_container_name]
        target_label: __path__
        separator: /
        replacement: /var/log/pods/*$1/$2/*.log
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: ceph_component
      - source_labels: [__meta_kubernetes_pod_label_ceph_daemon_id]
        target_label: ceph_daemon_id
      - source_labels: [__meta_kubernetes_pod_node_name]
        target_label: node
```

Deploy Promtail as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail-ceph
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: promtail-ceph
  template:
    metadata:
      labels:
        app: promtail-ceph
    spec:
      tolerations:
      - key: node-role.kubernetes.io/control-plane
        effect: NoSchedule
      containers:
      - name: promtail
        image: grafana/promtail:2.9.0
        args:
        - -config.file=/etc/promtail/promtail.yaml
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: promtail-ceph-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

## Query Ceph Logs in Loki

Use LogQL to search for specific Ceph events:

```bash
# Find all OSD-related logs
{ceph_component="rook-ceph-osd"} |= "slow request"

# Find monitor election events
{ceph_component="rook-ceph-mon"} |= "election"

# Count error rate per component over 5 minutes
sum by (ceph_component) (rate({namespace="rook-ceph"} |= "error" [5m]))
```

## Create a Grafana Dashboard Panel

Add a Loki data source log panel alongside Prometheus metrics:

```bash
# In Grafana, add a "Logs" panel with query:
{namespace="rook-ceph", ceph_component=~"rook-ceph-osd.*"} |= "ERR"
```

## Summary

Promtail's Kubernetes service discovery automatically discovers Ceph pods and attaches rich labels like daemon type and node name. Pairing Loki log streams with Ceph Prometheus metrics in a single Grafana dashboard gives operators a unified view for correlating performance issues with specific log events.
