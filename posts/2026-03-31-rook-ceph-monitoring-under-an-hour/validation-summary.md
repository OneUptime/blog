# Validation Summary: How to Set Up Ceph Monitoring in Under an Hour

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Prometheus (metrics collection)
- Grafana (dashboards and visualization)
- kube-prometheus-stack (Helm chart)
- Kubernetes ServiceMonitor (Prometheus Operator CRD)
- PrometheusRule (alerting rules)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Monitoring guide: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook GitHub monitoring examples: https://github.com/rook/rook/tree/master/deploy/examples/monitoring
- kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Grafana Ceph dashboard 2842: https://grafana.com/grafana/dashboards/2842/

## Issues Found
1. **Incorrect monitoring example URL**: The post referenced `prometheus-ceph-v15-rules.yaml` in the Rook monitoring examples directory, but this file does not exist in the Rook repository. The Ceph v15 (Octopus) version-specific rules file was removed as Ceph moved to newer releases (Reef, Squid). Replaced with `localrules.yaml`, which is the current file containing PrometheusRule definitions in the Rook monitoring examples.

## Review Notes
- When `spec.monitoring.enabled: true` is set in the CephCluster resource, Rook automatically creates a ServiceMonitor and PrometheusRule. The manual ServiceMonitor creation shown in the post is therefore redundant in most setups, though it is not incorrect and can be useful for custom configurations.
- The CephCluster spec, metrics port (9283), Helm chart flags, Prometheus metric names (`ceph_health_status`, `ceph_osd_up`), and alert threshold values (2 = HEALTH_ERR) are all technically correct.
- The Grafana dashboard ID 2842 is a valid and maintained Ceph overview dashboard on Grafana.com.
- The `serviceMonitorSelectorNilUsesHelmValues=false` flag is correctly used to allow Prometheus to discover ServiceMonitors across all namespaces.
