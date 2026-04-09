# Validation Summary: How to Set Up Multi-Cluster Monitoring with Custom Labels in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph (CephCluster CRD, `ceph.rook.io/v1`)
- Ceph MGR Prometheus module
- Prometheus Operator (ServiceMonitor CRD, `monitoring.coreos.com/v1`)
- Prometheus (external labels, remote write, federation)
- Grafana (template variables, PromQL queries)
- Kubernetes
- kube-prometheus-stack Helm chart

## Sources Consulted
- Rook CephCluster CRD source (`pkg/apis/ceph.rook.io/v1/types.go` on Rook GitHub) — confirmed `MonitoringSpec` fields and absence of label injection support
- Prometheus Operator API reference (https://prometheus-operator.dev/docs/api-reference/api/) — verified ServiceMonitor `relabelings` syntax
- Ceph MGR Prometheus module documentation (https://docs.ceph.com/en/latest/mgr/prometheus/) — verified metric names
- Ceph MGR Prometheus module source code (`src/pybind/mgr/prometheus/module.py` on Ceph GitHub) — confirmed `ceph_cluster_total_bytes`, `ceph_osd_up`, `ceph_health_status` metrics
- Prometheus federation documentation (https://prometheus.io/docs/prometheus/latest/federation/)

## Issues Found
1. **Incorrect claim about CephCluster CRD label injection**: The original text stated "The `externalMgrPrometheusPort` and `labels` settings in the CephCluster spec allow you to inject labels." This is incorrect — the CephCluster CRD's `monitoring` section has no `labels` or `externalLabels` field for injecting custom Prometheus metric labels. The `MonitoringSpec` only contains: `Enabled`, `MetricsDisabled`, `ExternalMgrEndpoints`, `ExternalMgrPrometheusPort`, `Port`, `Interval`, and `Exporter`. Fixed the introductory text to clarify that the CRD configures the metrics endpoint but label injection must be done via ServiceMonitor `relabelings` or Prometheus `externalLabels`.

## Review Notes
- The ServiceMonitor example uses `interval: 5s`, which is a very aggressive scrape interval for Ceph metrics. Most production deployments use 15s-60s. This is not technically incorrect but could cause performance issues at scale.
- The ServiceMonitor example omits `namespaceSelector` and `selector` fields, which are typically required to match Services. Acceptable for a focused example but readers should be aware they need these fields in practice.
- The federation config uses `job="rook-ceph"` as the match parameter. The actual job name depends on the ServiceMonitor name and Prometheus Operator configuration; the default Rook ServiceMonitor typically results in a job name of `rook-ceph-mgr`. Readers should verify their actual job label value.
- All Ceph Prometheus metric names used (`ceph_cluster_total_bytes`, `ceph_osd_up`, `ceph_health_status`) are verified correct.
- All PromQL syntax and Grafana template variable syntax is correct.
