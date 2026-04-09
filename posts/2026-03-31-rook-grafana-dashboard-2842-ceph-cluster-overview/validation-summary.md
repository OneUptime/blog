# Validation Summary: How to Set Up Grafana Dashboard 2842 for Ceph Cluster Overview

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Grafana (dashboard/visualization)
- Prometheus (metrics collection)
- Kubernetes (ServiceMonitor CRD, kubectl)
- Prometheus Operator (monitoring.coreos.com/v1)

## Sources Consulted
- Grafana HTTP API documentation for dashboard import: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Grafana source code (`pkg/services/dashboardimport/dashboardimport.go`) for `ImportDashboardRequest` struct fields
- Rook-Ceph documentation for monitoring configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Ceph Prometheus module documentation for metric names and default port (9283)
- Prometheus Operator documentation for ServiceMonitor CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor

## Issues Found
1. **Incorrect Grafana API import payload**: The original curl command used `{"dashboard": {"id": 2842}, ...}` to import the dashboard via the Grafana HTTP API. The `/api/dashboards/import` endpoint requires the `dashboard` field to contain the full dashboard JSON model, not just an object with an ID. Importing a grafana.com dashboard by ID is a two-step process: first fetch the JSON via `/api/gnet/dashboards/2842`, then post the full JSON to the import endpoint. Fixed by replacing the single curl command with the correct two-step fetch-then-import approach.

## Review Notes
- The ServiceMonitor label `prometheus: kube-prometheus` is a common convention but may need adjustment depending on the Prometheus Operator configuration (e.g., kube-prometheus-stack Helm chart often uses `release: <release-name>` for ServiceMonitor discovery).
- The PromQL custom panel query is technically correct — operator precedence in PromQL evaluates `A / B * 100` as `(A / B) * 100` (left-to-right associativity), which correctly computes a percentage. Adding parentheses would improve readability but is not required.
- The metric names `ceph_pool_bytes_used` and `ceph_pool_max_avail` are valid Ceph Prometheus module metrics.
- The Ceph MGR Prometheus module default port 9283 and the service name `rook-ceph-mgr` are correct for standard Rook-Ceph deployments.
- Dashboard 2842 on grafana.com is indeed the "Ceph - Cluster" overview dashboard.
