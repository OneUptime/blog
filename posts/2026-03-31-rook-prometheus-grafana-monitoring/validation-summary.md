# Validation Summary: How to Monitor Rook-Ceph with Prometheus and Grafana

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes
- Prometheus and Prometheus Operator
- Grafana
- kube-prometheus-stack Helm chart
- ServiceMonitor CRD (monitoring.coreos.com/v1)

## Sources Consulted
- Rook Ceph Monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Helm chart documentation: https://rook.io/docs/rook/latest/Helm-Charts/ceph-cluster-chart/
- Rook GitHub repository monitoring examples: https://github.com/rook/rook/tree/master/deploy/examples/monitoring
- Rook GitHub Grafana dashboards directory: https://github.com/rook/rook/tree/master/deploy/examples/monitoring/grafana
- Rook official ServiceMonitor example: https://github.com/rook/rook/blob/master/deploy/examples/monitoring/service-monitor.yaml
- Ceph Prometheus module source code (ceph/ceph GitHub)

## Issues Found

### 1. CRITICAL: Incorrect Grafana dashboard file names in curl commands (lines 141-149)
**What was wrong:** The blog used lowercase hyphenated file names (`ceph-cluster.json`, `ceph-osd.json`, `ceph-pools.json`) for the Grafana dashboard download URLs. The actual files in the Rook repository use spaces and "Dashboard" in their names: `Ceph Cluster Dashboard.json`, `Ceph OSD Single Dashboard.json`, `Ceph Pools Dashboard.json`. The original curl commands would return 404 errors.

**What was changed:** Updated the curl URLs to use the correct file names with URL-encoded spaces (`%20`), and quoted the URLs to ensure proper shell handling.

### 2. MINOR: Misleading comment on the `interval` field (line 60)
**What was wrong:** The comment said "Interval for health check metrics" but the CephCluster CRD describes this field as "The interval for the prometheus module to scrape targets" -- it controls the Prometheus module's general scrape interval, not specifically health checks.

**What was changed:** Updated the comment to "Interval for the Prometheus module to scrape targets" to match the CRD documentation.

## Review Notes
- The ServiceMonitor in the blog uses `interval: 15s` while the official Rook example uses `interval: 10s`. Both are valid; this is a reasonable customization, not an error.
- The blog's ServiceMonitor adds `release: kube-prometheus-stack` label and `scheme: http`, which differ from the official Rook example but are practical additions for kube-prometheus-stack users.
- All 17 Ceph Prometheus metric names listed in the post were verified correct against the Ceph source code.
- All PromQL queries are syntactically correct and semantically appropriate.
- The Helm commands, kubectl commands, and YAML configurations are all correct.
- Port 9283 is confirmed as the correct default Ceph Prometheus module port.
- The `spec.monitoring.enabled` field is confirmed in the CephCluster CRD.
- The Grafana dashboard file names in the Rook repo may change over time as the project evolves; readers should check the repository if the URLs stop working.
