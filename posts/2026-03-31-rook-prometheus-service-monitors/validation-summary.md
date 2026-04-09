# Validation Summary: How to Set Up Prometheus Service Monitors for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephCluster CRD, `ceph.rook.io/v1`)
- Prometheus Operator (`monitoring.coreos.com/v1` — ServiceMonitor, Prometheus resources)
- Ceph Manager Prometheus module
- Kubernetes (namespaces, labels, CRDs, port-forwarding)
- kube-prometheus-stack Helm chart

## Sources Consulted
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Prometheus Monitoring guide — https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook MonitoringSpec Go types — https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook example ServiceMonitor manifest — https://github.com/rook/rook/blob/master/deploy/examples/monitoring/service-monitor.yaml
- Rook MGR operator code (port name, ServiceMonitor creation) — https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mgr/mgr.go
- Prometheus Operator API reference — https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes Namespaces documentation (automatic labels) — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Well-Known Labels reference — https://kubernetes.io/docs/reference/labels-annotations-taints/
- Ceph Manager Prometheus module documentation — https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus HTTP API documentation — https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
No technical issues found.

## Review Notes
- The "Alternatively, label the rook-ceph namespace" suggestion (`kubectl label namespace rook-ceph prometheus=enabled`) is a valid general pattern, but the Prometheus resource example shown directly above it uses `kubernetes.io/metadata.name: rook-ceph` as the namespace selector — not the `prometheus: enabled` label. Readers should understand that using the alternative label would require updating the Prometheus resource's `serviceMonitorNamespaceSelector` accordingly. This is not an error, but a minor clarity gap.
- The scrape intervals used (5s for manual, 10s for automatic) are quite aggressive. In production, 15s–30s is more common to avoid excess load on the Ceph MGR. This is a tuning preference, not a correctness issue.
- The `kubernetes.io/metadata.name` label on namespaces requires Kubernetes 1.21+. The post does not mention a minimum Kubernetes version, but given Rook-Ceph's own version requirements, this is unlikely to be an issue in practice.
