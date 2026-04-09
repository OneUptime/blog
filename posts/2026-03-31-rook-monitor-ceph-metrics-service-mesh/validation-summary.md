# Validation Summary: How to Monitor Ceph Storage Metrics Through Service Mesh

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Istio (service mesh)
- Prometheus (monitoring/metrics)
- Grafana (dashboards)
- Jaeger (distributed tracing)
- Kubernetes (ServiceMonitor, PodMonitor CRDs)
- PromQL (query language)

## Sources Consulted
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus Integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Application Requirements (port table): https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio v1 APIs blog post (Telemetry API graduation): https://istio.io/latest/blog/2024/v1-apis/
- Rook CephCluster CRD MonitoringSpec: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook MGR operator source: https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mgr/mgr.go
- Rook example ServiceMonitor: https://github.com/rook/rook/blob/master/deploy/examples/monitoring/service-monitor.yaml
- Ceph MGR Prometheus Module Documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph MDS performance dashboard (cephmetrics): https://github.com/ceph/cephmetrics/blob/master/dashboards/mgr-prometheus/mds-performance.json

## Issues Found

1. **`rulesNamespaceOverride` is not a CephCluster CRD field** (was in the CephCluster monitoring spec snippet): This field exists only as a Helm chart value in the `rook-ceph-cluster` chart, not in the CephCluster CRD `MonitoringSpec`. Including it in a raw CephCluster manifest would be silently ignored. Removed the field from the snippet.

2. **Misleading PromQL comment**: The comment said "RGW request rate correlated with application error rate" but the query does not filter `istio_requests_total` by error response codes and multiplies two rates (which is not a correlation). Changed the comment to "RGW request rate joined with pool write rate" to accurately describe the query.

3. **Incorrect Ceph MDS metric name**: `ceph_mds_sessions_total` does not exist. The correct metric name is `ceph_mds_sessions_sessions_open`, derived from the MDS `mds_sessions` perf counter collection with the `sessions_open` sub-counter. Fixed in the correlation metrics table.

4. **Missing `_total` suffix on Istio TCP metric**: `istio_tcp_connections_opened` should be `istio_tcp_connections_opened_total` per Prometheus counter naming conventions and Istio's standard metrics. Fixed in the correlation metrics table.

5. **Outdated Telemetry API version**: `telemetry.istio.io/v1alpha1` graduated to `telemetry.istio.io/v1` in Istio 1.22. Updated to the current stable API version.

## Review Notes
- The Grafana panel PromQL for histogram_quantile omits the `sum(...) by (le)` aggregation wrapper that the standalone PromQL example correctly includes. While functional for single time series, the recommended pattern is to aggregate by `le`. This is acceptable as a simplified dashboard snippet.
- The `* on() group_left` in the correlation PromQL is technically unnecessary when both sides produce single-element vectors from `sum()`. Plain `*` would suffice. Left as-is since it demonstrates the cross-metric join technique which is the pedagogical point.
- The Istio PodMonitor uses `security.istio.io/tlsMode: istio` as a selector label, which is valid but selects all pods with mTLS enabled rather than specifically targeting application pods. In practice, users may want a more targeted selector.
