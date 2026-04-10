# Validation Summary: How to Configure Ceph Monitoring in the CephCluster CRD

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes
- Prometheus / Prometheus Operator
- ServiceMonitor CRD
- PrometheusRule CRD
- Grafana

## Sources Consulted
- Rook official documentation - Ceph Monitoring: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook official documentation - CephCluster CRD reference: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub repository - monitoring examples directory: https://github.com/rook/rook/tree/master/deploy/examples/monitoring
- Rook GitHub repository - service-monitor.yaml: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/service-monitor.yaml
- Rook GitHub repository - localrules.yaml (PrometheusRule alerts): https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/localrules.yaml
- Rook GitHub repository - operator.yaml (operator deployment): https://raw.githubusercontent.com/rook/rook/master/deploy/examples/operator.yaml
- Rook GitHub repository - Grafana dashboards directory: https://github.com/rook/rook/tree/master/deploy/examples/monitoring/grafana
- Rook GitHub repository - rook-ceph Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml

## Issues Found

1. **"Disabling Certain Metrics" section showed `metricsDisabled: false` instead of `true`**: The text described disabling high-cardinality metrics but the YAML example had `metricsDisabled: false`, which keeps all metrics enabled. Fixed to `metricsDisabled: true` and clarified the description.

2. **Incorrect Prometheus rules file path**: The post referenced `rook/deploy/examples/monitoring/prometheus-ceph-rules.yaml`, which does not exist in the Rook repository. The correct file is `rook/deploy/examples/monitoring/localrules.yaml` (for in-cluster Prometheus) or `externalrules.yaml` (for external Prometheus). Fixed to `localrules.yaml`.

3. **Incorrect Grafana dashboards file path**: The post referenced `rook/deploy/examples/monitoring/grafana-dashboards.yaml` as a single YAML file of ConfigMaps, but this file does not exist. Grafana dashboards are provided as individual JSON files in the `deploy/examples/monitoring/grafana/` subdirectory. Fixed to show the actual JSON file listing.

4. **Incorrect alert name `CephMonQuorumAtRisk`**: The actual alert name in the Rook-provided PrometheusRule is `CephMonDownQuorumAtRisk`. Fixed.

5. **Incorrect alert name `CephNearFull`**: No alert with this exact name exists. The closest matching alerts are `CephOSDNearFull`, `CephPoolNearFull`, and `CephOSDFull`. Fixed to `CephOSDNearFull` with an updated description.

6. **Incorrect operator metrics service name, port, and protocol**: The post claimed the operator exposes metrics via `svc/rook-ceph-operator-metrics` on port 9443 over HTTPS. In reality, operator metrics are disabled by default (`ROOK_OPERATOR_METRICS_BIND_ADDRESS: "0"` in the ConfigMap). When enabled, they are served on port 8080 over HTTP. Fixed the section to explain the opt-in configuration and corrected the port-forward command.

## Review Notes
- The Grafana dashboard IDs (2842, 5336, 5342) are confirmed correct per the official Rook documentation.
- The ServiceMonitor name `rook-ceph-mgr` and metrics port 9283 are confirmed correct.
- The `metricsDisabled` field is a valid field in the CephCluster CRD monitoring spec, confirmed via the CRD reference documentation.
- The `ceph_health_status` metric values (0=OK, 1=WARN, 2=ERROR) are correct.
- The Ceph version image `quay.io/ceph/ceph:v19.2.0` refers to Ceph Squid, which is a current release line.
- The post correctly identifies the Prometheus Operator as a prerequisite and provides valid CRD verification commands.
