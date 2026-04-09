# Validation Summary: How to Monitor an External Ceph Cluster Through Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes
- Prometheus Operator / ServiceMonitor / PrometheusRule
- Grafana dashboards
- Ceph MGR Prometheus module

## Sources Consulted
- Rook CephCluster CRD source (`pkg/apis/ceph.rook.io/v1/types.go`) for `MonitoringSpec` fields: `externalMgrEndpoints`, `externalMgrPrometheusPort`, `createPrometheusRules`
- Rook GitHub repository `deploy/examples/monitoring/grafana/` directory for actual dashboard filenames
- Ceph MGR Prometheus module documentation for default port 9283 and metric names
- Ceph Prometheus metric definitions for `ceph_health_status` values (0=OK, 1=WARN, 2=ERR)
- Ceph Prometheus metric definitions for `ceph_cluster_total_used_bytes` and `ceph_cluster_total_bytes`
- Kubernetes API reference for Service, Endpoints, ConfigMap resources
- Prometheus Operator CRD reference for ServiceMonitor and PrometheusRule resources

## Issues Found
1. **Incorrect Grafana dashboard download URLs (Step 5)**: The blog used lowercase hyphenated filenames (`ceph-cluster.json`, `ceph-pools.json`) for the Grafana dashboard download URLs from the Rook GitHub repository. The actual files in the Rook v1.14.0 repository use spaces and "Dashboard" in their names: `Ceph Cluster Dashboard.json` and `Ceph Pools Dashboard.json`. The original curl commands would return 404 errors. Fixed the URLs to use the correct filenames with URL-encoded spaces (`Ceph%20Cluster%20Dashboard.json`, `Ceph%20Pools%20Dashboard.json`) and added single quotes around the URLs.

## Review Notes
- The Grafana dashboard IDs (2842, 5336, 5342) referenced for grafana.com import are community-maintained dashboards, not official Rook dashboards. They may become outdated or unavailable over time.
- All CephCluster CR fields (`externalMgrEndpoints`, `externalMgrPrometheusPort`, `createPrometheusRules`, `crashCollector.disable`) are valid and correctly used.
- The `ceph_health_status` metric values (1=WARN, 2=ERR) and capacity metrics (`ceph_cluster_total_used_bytes`, `ceph_cluster_total_bytes`) are correct.
- The manual Service + Endpoints pattern for exposing external MGR metrics is a valid Kubernetes approach for headless services pointing to external IPs.
- The ServiceMonitor and PrometheusRule YAML manifests are syntactically correct and use proper label selectors.
